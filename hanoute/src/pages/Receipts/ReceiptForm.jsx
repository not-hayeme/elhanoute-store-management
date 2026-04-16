import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api";
import "./ReceiptForm.scss";

export default function ReceiptForm() {
	const [searchParams] = useSearchParams();
	const id = searchParams.get("id");
	const navigate = useNavigate();

	console.log("🟡 ReceiptForm component loaded with id:", id);
	console.log("🟡 Current URL:", window.location.href);

	console.log("ReceiptForm loaded with id:", id);

	const [form, setForm] = useState({
		storeId: "",
		customerId: "",
		items: [],
		discount: 0,
		pricePayed: 0,
	});

	const [stores, setStores] = useState([]);
	const [storesLoading, setStoresLoading] = useState(false);
	const [storesError, setStoresError] = useState(null);

	const [customers, setCustomers] = useState([]);
	const [items, setItems] = useState([]);

	const [selectedItems, setSelectedItems] = useState({});

	// Debug: log form state changes
	useEffect(() => {
		console.log("Form state updated:", form);
	}, [form]);

	// Debug: log selectedItems changes
	useEffect(() => {
		console.log("SelectedItems updated:", selectedItems);
	}, [selectedItems]);

	// Fetch stores (and receipt if editing)
	useEffect(() => {
		setStoresLoading(true);
		setStoresError(null);
		api.get("/stores")
			.then((res) => {
				setStores(Array.isArray(res.data) ? res.data : []);
			})
			.catch((err) => {
				setStoresError(
					err.response?.data?.error ||
						err.message ||
						"Failed to load stores"
				);
				setStores([]);
			})
			.finally(() => setStoresLoading(false));

		// if editing existing receipt
		if (id) {
			console.log("Fetching receipt with ID:", id);
			api.get(`/receipts/${id}`)
				.then((res) => {
					const r = res.data;
					console.log("✅ Receipt fetch successful - Full response:", res);
					console.log("✅ Receipt data:", r);
					console.log("✅ Receipt items:", r.items);
					console.log("✅ Receipt storeId:", r.storeId);
					console.log("✅ Receipt customerId:", r.customerId);
					console.log("✅ Receipt discount:", r.discount);
					console.log("✅ Receipt pricePayed:", r.pricePayed);
					setForm({
						storeId: r.storeId || "",
						customerId: r.customerId?._id || r.customerId || "",
						items: r.items || [],
						discount: r.discount || 0,
						pricePayed: r.pricePayed || 0,
					});
					console.log("✅ Form set with:", {
						storeId: r.storeId || "",
						customerId: r.customerId?._id || r.customerId || "",
						itemsCount: r.items?.length || 0,
						discount: r.discount || 0,
						pricePayed: r.pricePayed || 0,
					});
				})
				.catch((err) => {
					console.error("❌ Failed to load receipt:", err);
					console.error("❌ Error response:", err.response);
					console.error("❌ Error message:", err.message);
				});
		}
	}, [id]);

	// Load customers and items when store changes
	useEffect(() => {
		if (!form.storeId) return;

		console.log("Loading customers and items for store:", form.storeId);

		api.get(`/customers?storeId=${form.storeId}`)
			.then((res) => {
				console.log("Loaded customers:", res.data);
				setCustomers(res.data);
			})
			.catch(() => setCustomers([]));

		api.get(`/items?storeId=${form.storeId}`)
			.then((res) => {
				console.log("Loaded items:", res.data);
				setItems(res.data);
			})
			.catch(() => setItems([]));
	}, [form.storeId]);

	// Populate selectedItems when editing and items are loaded
	useEffect(() => {
		console.log("🔄 selectedItems effect triggered - id:", id, "form.items.length:", form.items?.length, "items.length:", items.length);
		if (!id || !form.items?.length || items.length === 0) {
			console.log("⏭️ Skipping selectedItems population - conditions not met");
			return;
		}

		console.log("✅ Populating selectedItems from form.items:", form.items);
		console.log("✅ Available items:", items.map(i => ({_id: i._id, name: i.name})));

		const map = {};
		form.items.forEach((receiptItem) => {
			// itemId might be populated (object) or just string ID
			const itemId = receiptItem.itemId?._id || receiptItem.itemId;
			const item = items.find(i => i._id === itemId);
			
			if (item) {
				// Use the price stored in the receipt (not the current item price)
				const storedPrice = receiptItem.price ?? 0;
				console.log(`Using stored price for item ${item.name}: ${storedPrice} DA (current item price: ${item.price ?? 0} DA)`);
				map[itemId] = {
					checked: true,
					unitPrice: storedPrice,
					units: receiptItem.quantity ?? 0,
					boxes: 0,
					expanded: false,
				};
			} else {
				console.warn("Item not found for itemId:", itemId, "Available items:", items.map(i => i._id));
			}
		});
		console.log("Created selectedItems map:", map);
		setSelectedItems(map);
	}, [id, form.items, items]);

	const handleChange = (e) =>
		setForm({ ...form, [e.target.name]: e.target.value });

	const toggleItem = (item) => {
		setSelectedItems((prev) => {
			const copy = { ...prev };
			if (copy[item._id]) delete copy[item._id];
			else {
				copy[item._id] = {
					checked: true,
					unitPrice: item.price ?? 0,
					units: 1,
					boxes: 0,
					expanded: false,
				};
			}
			return copy;
		});
	};

	const updateSelectedItem = (itemId, changes) => {
		setSelectedItems((prev) => ({
			...prev,
			[itemId]: { ...(prev[itemId] || {}), ...changes },
		}));
	};

	const computeItemUnitsFromBoxes = (item, boxes) => {
		const perBox = item.unitsPerBox || 1;
		return boxes * perBox;
	};

	const computeTotals = () => {
		let subtotal = 0;
		Object.entries(selectedItems).forEach(([itemId, s]) => {
			if (!s) return;
			const item = items.find((i) => i._id === itemId);
			if (!item) return;
			const unitsFromBoxes = computeItemUnitsFromBoxes(item, s.boxes || 0);
			const totalUnits = (Number(s.units) || 0) + unitsFromBoxes;
			const unitPrice = Number(s.unitPrice) || 0;
			subtotal += totalUnits * unitPrice;
		});
		const discount = Number(form.discount) || 0;
		const total = Math.max(0, subtotal - discount);
		return { subtotal, total };
	};

	const handleSubmit = async (e) => {
		e.preventDefault();

		if (!form.storeId) {
			alert("Please select a store");
			return;
		}

		const itemsArray = Object.entries(selectedItems)
			.map(([itemId, s]) => {
				const item = items.find((i) => i._id === itemId);
				const unitsFromBoxes = item ? computeItemUnitsFromBoxes(item, s.boxes || 0) : 0;
				const totalUnits = (Number(s.units) || 0) + unitsFromBoxes;
				return {
					itemId,
					quantity: totalUnits,
					price: Number(s.unitPrice) || 0, // Backend uses 'price' not 'unitPrice'
				};
			})
			.filter((i) => i.quantity > 0);

		const payload = {
			storeId: form.storeId,
			customerId: form.customerId || undefined,
			items: itemsArray,
			discount: Number(form.discount) || 0,
			pricePayed: Number(form.pricePayed) || 0,
		};

		console.log("Submitting receipt payload:", payload);

		try {
			if (id) await api.put(`/receipts/${id}`, payload);
			else await api.post("/receipts", payload);
			navigate("/receipts");
		} catch (err) {
			console.error("Failed to save receipt", err);
			alert(err.response?.data?.error || "Save failed");
		}
	};

	const { subtotal, total } = computeTotals();

	return (
		<div className="receipt-form-container">
			<div className="receipt-card">
				<h2>{id ? "Edit Receipt" : "Add Receipt"}</h2>

				<form className="receipt-form" onSubmit={handleSubmit}>
					<div className="form-column">
						{/* Store Picker */}
						<div className="form-section">
							<label className="label">Store</label>
							<select
								className="select"
								name="storeId"
								value={form.storeId}
								onChange={handleChange}
								disabled={!!id} // prevent changing store when editing
							>
								<option value="">Select store</option>
								{stores.map((s) => (
									<option key={s._id} value={s._id}>
										{s.name}
									</option>
								))}
							</select>
						</div>

						{/* Customer Picker */}
						<div className="form-section">
							<label className="label">Customer</label>
							{console.log("Rendering customer dropdown - form.customerId:", form.customerId, "customers:", customers)}
							<select
								className="select"
								name="customerId"
								value={form.customerId || ""}
								onChange={handleChange}
							>
								<option value="">Select customer (optional)</option>
								{customers.map((c) => (
									<option key={c._id} value={c._id}>
										{c.name}
									</option>
								))}
							</select>
							{form.customerId && customers.length > 0 && !customers.find(c => c._id === form.customerId) && (
								<div style={{color: 'orange', fontSize: 12, marginTop: 4}}>
									Warning: Selected customer not found in list
								</div>
							)}
						</div>

						{/* Items */}
						<div className="form-section">
							<label className="label">Items</label>
							{console.log("Rendering items - selectedItems:", selectedItems, "items:", items)}
							<div className="items-list">
								{items.length === 0 && (
									<div style={{ color: "#777" }}>
										No items for selected store.
									</div>
								)}

								{items.map((item) => {
									const s =
										selectedItems[item._id] || {
											checked: false,
											unitPrice: item.price ?? 0,
											units: 0,
											boxes: 0,
											expanded: false,
										};
									// Calculate total units: direct units + units from boxes
									const unitsFromBoxes = computeItemUnitsFromBoxes(item, s.boxes || 0);
									const totalUnits = (Number(s.units) || 0) + unitsFromBoxes;
									const itemTotal =
										(Number(s.unitPrice) || 0) * totalUnits;

									return (
										<div key={item._id} className="item-card">
											<div
												className="item-header"
												onClick={() => {
													if (!s.checked) toggleItem(item);
													else
														updateSelectedItem(item._id, {
															expanded: !s.expanded,
														});
												}}
											>
												<input
													type="checkbox"
													checked={!!s.checked}
													onChange={(e) => {
														e.stopPropagation();
														toggleItem(item);
													}}
												/>
												<div style={{ flex: 1 }}>
													<div
														style={{
															display: "flex",
															justifyContent: "space-between",
															alignItems: "center",
														}}
													>
														<div className="item-title">
															<strong>{item.name}</strong>
															<div className="item-meta">
																ref: {item.reference}
															</div>
														</div>
														<div className="item-summary">
															<div style={{ fontWeight: 600 }}>
																{itemTotal.toFixed(2)} DA
															</div>
															<div className="item-meta">
																{totalUnits} units total
															</div>
														</div>
													</div>
												</div>
											</div>

											{s.expanded && s.checked && (
												<div
													className="item-expanded"
													onClick={(e) => e.stopPropagation()}
												>
													<div className="item-controls">
														<div className="control">
															<label className="label">
																Unit price
															</label>
															<input
																className="input"
																type="number"
																value={s.unitPrice}
																onChange={(e) =>
																	updateSelectedItem(item._id, {
																		unitPrice: e.target.value,
																	})
																}
															/>
														</div>

														<div className="control">
															<label className="label">Units</label>
															<div style={{ display: "flex", gap: 6 }}>
																<button
																	type="button"
																	className="btn btn-sm"
																	onClick={() =>
																		updateSelectedItem(item._id, {
																			units: Math.max(
																				0,
																				(Number(s.units) || 0) -
																					1
																			),
																		})
																	}
																>
																	-
																</button>
																<input
																	className="input"
																	type="number"
																	value={s.units}
																	onChange={(e) =>
																		updateSelectedItem(item._id, {
																			units: e.target.value,
																		})
																	}
																	style={{ width: 80 }}
																/>
																<button
																	type="button"
																	className="btn btn-sm"
																	onClick={() =>
																		updateSelectedItem(item._id, {
																			units:
																				(Number(s.units) || 0) +
																				1,
																		})
																	}
																>
																	+
																</button>
															</div>
														</div>

														<div className="control">
															<label className="label">Boxes</label>
															<input
																className="input"
																type="number"
																value={s.boxes}
																onChange={(e) => {
																	updateSelectedItem(item._id, {
																		boxes: Number(e.target.value) || 0,
																	});
																}}
															/>
														</div>

														<div className="control">
															<label className="label">
																Total price
															</label>
															<input
																className="input"
																type="number"
																value={itemTotal.toFixed(2)}
																onChange={(e) => {
																	const newTotal =
																		Number(e.target.value) || 0;
																	const unitsFromBoxes = computeItemUnitsFromBoxes(item, s.boxes || 0);
																	const totalUnits = (Number(s.units) || 0) + unitsFromBoxes;
																	const newUnitPrice =
																		totalUnits > 0
																			? newTotal / totalUnits
																			: newTotal;
																	updateSelectedItem(item._id, {
																		unitPrice: newUnitPrice,
																	});
																}}
															/>
														</div>

														<div>
															<button
																type="button"
																className="btn btn-delete"
																onClick={() =>
																	setSelectedItems((prev) => {
																		const c = { ...prev };
																		delete c[item._id];
																		return c;
																	})
																}
															>
																Delete
															</button>
														</div>
													</div>
												</div>
											)}
										</div>
									);
								})}
							</div>
						</div>

						<div className="form-section">
							<label className="label">Discount</label>
							<input
								className="input"
								name="discount"
								type="number"
								value={form.discount ?? 0}
								onChange={handleChange}
							/>
						</div>

						<div className="form-section">
							<label className="label">Price Paid</label>
							<input
								className="input"
								name="pricePayed"
								type="number"
								value={form.pricePayed ?? 0}
								onChange={handleChange}
							/>
						</div>
					</div>

					<div className="form-column">
						<div className="totals">
							<div>
								<strong>Subtotal:</strong> {subtotal.toFixed(2)} DA
							</div>
							<div>
								<strong>Total after discount:</strong>{" "}
								{total.toFixed(2)} DA
							</div>
						</div>
						<div style={{ marginTop: 12 }}>
							<button className="btn" type="submit">
								{id ? "Update Receipt" : "Add Receipt"}
							</button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
