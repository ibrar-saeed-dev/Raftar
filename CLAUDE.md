# Raftar — Project Context

Raftar is a ride-hailing app (like inDrive Pakistan). Cash-based, no payment integration for now.

## Structure
- `server/` — Node.js, Express, MongoDB (Mongoose), Socket.io backend
- `Raftar/` — React Native (Expo) mobile app
- `admin/` — React web admin portal

## Working Features (do NOT break these)
- Auth: signup, login, JWT, OTP, role-based (passenger/driver/admin)
- Ride hailing: inDrive-style bidding (passenger offers, drivers counter, passenger picks), AI fare pricing, multi-stop (pickup + up to 3 stops + dropoff)
- Carpool: two-sided, map-based location picker
- Intercity: rides + carpool, scheduled
- Parcel delivery: with weight/size/instructions, own statuses
- Guest booking: book for someone else (name, relation, phone)
- VoIP calling: in-app WebRTC audio between driver and passenger
- Ride sharing: secure deep link to a read-only live-tracking map
- History + ratings: both parties rate after completion
- Earnings (driver) + spending (passenger)
- Real-time via Socket.io (driver/passenger location, ride events)

## Vehicle Types (exactly 5)
bike (1), rickshaw (3), car (4), AC car (4), luxury (4)

## Navigation
Stack-based navigation with a hamburger sidebar menu (no bottom tabs). Navigators: AuthNavigator, MainNavigator (wraps PassengerNavigator + DriverNavigator). Passenger flow: HomeScreen → BookRideScreen → RideTrackingScreen. Driver flow: DriverDashboardScreen → RideRequestScreen → ActiveRideScreen. Uses SlideFromRightIOS transitions.

## Current Theme
No global theme file yet — styles are local StyleSheet.create using shared constants. Current palette: yellow (#F8B82A, #F9C349), teal (#4ECDC4 pickup/success), coral (#FF6B6B dropoff/danger), orange (#FF9F43 stops). Uses LinearGradient and react-native-animatable heavily. No dark mode yet.

## Target Design System (apply across all screens)
- Add proper LIGHT and DARK mode. DARK = black bg (#0F0F0F), dark cards (#1A1A1A), white text. LIGHT = white bg (#FFFFFF), light-grey cards (#F5F5F5), black text.
- Accent (both modes): golden yellow #FFC107, used ONLY on the primary action per screen. Don't overuse yellow.
- Secondary text: grey #8A8A8A.
- Keep teal for pickup, coral for dropoff, orange for stops (functional colors).
- Buttons: full-width, 14px radius, yellow bg + dark text. One primary button per screen.
- Cards: 12-14px radius, subtle border, ~14px padding.
- Vehicle selection: full-width ROWS (icon left, name+info middle, price right); selected row expands with fare stepper. Price is the hero (large, bold).
- Two-tier text: bright/white titles, grey secondary.
- Clean outline icons, consistent set (fix current invalid icon names).
- Match inDrive/Uber: minimal, spacious, no clutter.
- Reduce heavy gradients/glassmorphism where it looks dated; prefer flat clean surfaces.

## Known Issues (be aware)
- Deprecated SafeAreaView (migrate to react-native-safe-area-context)
- Invalid icon names (car-cool, car-parking, twitter, etc.) — fix to valid names
- Push notifications need a dev build (Expo Go SDK 53 dropped support)
- Admin portal has separate issues (not priority now)

## Rules for Claude Code
- Work ONE screen/feature at a time. Build, verify it compiles, tell me what to test.
- Reuse existing logic — change UI/layout only, unless asked otherwise.
- Never break working features. Don't rebuild from scratch.
- After changes, list every file modified.