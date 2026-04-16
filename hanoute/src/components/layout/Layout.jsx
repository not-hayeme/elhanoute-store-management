import SideBar from "./Sidebar/SideBar";
import TopBar from "./Topbar/TopBar";

export default function Layout({ children }) {
  return (
    <div className="flex h-screen bg-[#f1f8f4]">
      <SideBar />
      <div className="flex flex-col flex-grow">
        <TopBar />
        <main className="p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
