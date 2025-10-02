# Archie Random Icon Feature

This feature adds a clickable character named "Archie" that appears periodically and randomly on the screen. When clicked, the player receives a money reward and Archie disappears for at least 5 minutes.

## Components Added

1. **RandomIcon.tsx** - Generic component that displays an icon at random positions on screen
2. **ArchieIcon.tsx** - Specific implementation for the Archie character
3. **Toast.tsx** - Toast notification system for displaying rewards
4. **ArchieContext.tsx** - Context provider for managing Archie state

## Features

- Archie appears randomly on the screen at intervals between 30 seconds and 2 minutes
- Stays visible for 15 seconds before disappearing
- When clicked, gives a monetary reward (base: $25)
- Has a 5-minute cooldown before reappearing
- Includes "streak" system - clicking multiple Archies in succession increases rewards
- Shows toast notifications with reward amount and streak information
- Animations for appearance and hover effects
- Persists last click time in localStorage

## Game Impact

This feature adds more interactivity to the game, giving players an incentive to stay engaged and watch for opportunities to earn bonus money.

## Future Enhancements

Possible improvements:
- Tie Archie's reward to game progression (higher farm tier = higher rewards)
- Add more characters with different rewards
- Special holiday appearances with themed rewards