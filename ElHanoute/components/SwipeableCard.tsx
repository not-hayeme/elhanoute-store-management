import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

export interface SwipeAction {
  key: string;
  icon: React.ReactNode;
  backgroundColor: string;
  onPress: () => void;
}

export interface SwipeableCardProps {
  children: React.ReactNode;
  actions: SwipeAction[];
  swipeThreshold?: number;
  style?: any;
}

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  actions,
  swipeThreshold = 120,
  style,
}) => {
  const translateX = new Animated.Value(0);
  const [isRevealed, setIsRevealed] = useState(false);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;

      if (translationX < -swipeThreshold) {
        // Swiped left far enough - reveal actions
        const buttonWidth = 45;
        const gap = 8;
        const padding = 8 * 2; // paddingHorizontal * 2
        const revealDistance = actions.length * buttonWidth + (actions.length - 1) * gap + padding;
        Animated.spring(translateX, {
          toValue: -revealDistance,
          useNativeDriver: false,
        }).start(() => {
          setIsRevealed(true);
        });
      } else {
        // Not swiped far enough or swiped right - return to original position
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: false,
        }).start(() => {
          setIsRevealed(false);
        });
      }
    }
  };

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: false,
    }).start(() => {
      setIsRevealed(false);
    });
  };

  const handleActionPress = (action: SwipeAction) => {
    closeSwipe();
    action.onPress();
  };

  return (
    <View style={[styles.swipeableContainer, style]}>
      {/* Action Buttons Background (Revealed on swipe) */}
      <View style={styles.actionsBackground}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={[styles.actionButton, { backgroundColor: action.backgroundColor }]}
            onPress={() => handleActionPress(action)}
          >
            {action.icon}
          </TouchableOpacity>
        ))}
      </View>

      {/* Swipeable Content */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View
          style={[
            styles.card,
            { transform: [{ translateX }] }
          ]}
        >
          {children}
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  swipeableContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  actionsBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    gap: 8, // Gap between buttons
    paddingHorizontal: 8, // Padding around the button group
  },
  actionButton: {
    width: 45, // Smaller width
    height: 45, // Fixed height instead of 100%
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22.5, // Half of width for circular buttons
  },
  card: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
});

export default SwipeableCard;