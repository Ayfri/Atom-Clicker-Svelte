# What's new 16-07-2025

### New Features
- **Purple Realm**: Unlock a mysterious new gameplay dimension with the "Purple Realm" upgrade
  - New violet-themed interface with dynamic color switching
  - Interactive violet circles spawn randomly across the screen
  - Click circles to collect **Photons**, a new currency
  - Circles fade over time, adding urgency to the gameplay
  - Complete visual transformation when the realm is unlocked

### Technical Improvements
- Added new Photons currency system with violet (#9966cc) theming
- Implemented dynamic accent color switching between blue and violet themes
- Extended save system to version 11 with automatic migration
- New PurpleRealm component with real-time circle spawning and lifecycle management

### Balance Changes
- Purple Realm upgrade costs 1,000,000,000 Atoms to unlock
- Photon circles award 1-10 Photons each
- Circle spawn rate: every 2 seconds
- Circle lifetime: 5 seconds before disappearing

# What's new 30-06-2025

- Added a new stat for the total number of bonus photons clicked.
- Added new achievements for bonus photons clicked.

# What's new 01-06-2025

- Added a lot of new skill tree upgrades.
- Added 2 new secret achievements.
- Added new colors for buildings.
- Added a new tooltip for the counter.
- Fixed a bug where total protonizing achievements were not detecting the correct value.
- Tweak achievements milestones to be more realistic.

# What's new 31-05-2025

- Migrated to Supabase for authentication and database, lost a few hours of progress for everyone sorry :(
- Made editing username work.
- Made cloud saves work.

# What's new 17-02-2025

- Added more upgrades related to electrons and protons.
- Increased the prices of upgrades.
- Added upgrades for click power, click value, and global click power based on achievements and atoms per second.
- Added upgrades for power-up interval reduction and level boosts.
- Added upgrades for protons, including production boost and electron gain multipliers.
- Added upgrades for auto-clicking and starting atoms after protonise.
- Added upgrades for auto-buying buildings and auto-upgrading system for electrons.
- Reduced power-up spawn interval through upgrades for electrons.

# What's new 12-02-2025

- Adjusted mobile navbar positioning for better display on smaller screens.
- Fix changing username not working for some users.
- Implemented cloud save functionality with authentication and data obfuscation.

# What's new 11-02-2025

- Keep proton and electron upgrades during proton and electron resets.
- Obfuscated the leaderboard requests to prevent cheating.
- Revamped project README with comprehensive game overview and features.

# What's new 10-02-2025

- Fix offset issue when clicking.
- Ensure electrons are reset in total reset for the game.
- Prevent gaining XP when levels feature isn't unlocked.

# What's new 09-02-2025

- Added changelog menu, displays notifications when you have unread changes
- Added electrons as a new in-game currency.
- Display electron balance in the game interface alongside existing currencies.
- Implemented support for tracking and updating electron balances in the game.
- Included electron interactions in currency management functions.
- Updated the game save system to include electrons in saved game states.
