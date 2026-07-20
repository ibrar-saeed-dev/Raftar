# Raftar Project Status Report

*Last Updated: 2026-07-17*

## 1. Features
* **Ride Hailing:** **Fully Working.** Users can book rides with AI-based fare pricing, bidding/counter-offers, and multi-stop support (pickup, up to 3 intermediate stops, dropoff). Driver location is tracked via WebSockets.
* **Carpooling:** **Fully Working.** Interactive map-based location picker for both passengers and drivers to search/post carpools.
* **Intercity:** **Functional.** Passengers can book intercity rides or carpools using standard flows.
* **Parcel Delivery:** **Fully Working.** Users can send packages with specific details (weight, size, instructions) and tracked via distinct statuses ("Pick Up Parcel", "Delivering Parcel").
* **Guest Booking:** **Fully Working.** Users can book rides for someone else, storing guest name, relation, and phone number.
* **VoIP Calling:** **Fully Working.** In-app WebRTC audio calling between driver and passenger, avoiding phone number exposure.
* **Ride Sharing:** **Fully Working.** Passengers can generate a secure deep link to share live ride tracking with unauthorized viewers via a standalone read-only map screen.
* **History & Ratings:** **Fully Working.** Ride history is stored and both parties can rate each other upon completion.
* **Admin Dashboard:** **Functional.** Web dashboard for managing users, drivers, trips, and payments.

## 2. Mobile App Screens

### Passenger Screens (Mostly UI Finished & Modernized)
* `HomeScreen.js`: Static dashboard, top-notch yellow header, side-menu trigger, location inputs mapped.
* `BookRideScreen.js`: Unified single-screen ride booking with visual stops, map polyline, vehicle selection, and dynamic AI fare calculation.
* `RideTrackingScreen.js`: Live map tracking, WebRTC call controls, chat, SOS button, share ride link, and counter-offer management.
* `BookCarpoolScreen.js` / `BookIntercityScreen.js`: Specialized flows for carpool and long-distance bookings.
* `SendParcelScreen.js`: Inputs for parcel logistics.
* `PaymentScreen.js` / `SpendingScreen.js`: Fare/spending management interfaces.

### Driver Screens (UI Finished)
* `DriverDashboardScreen.js`: Online/offline toggle, map visualization, active ride checking.
* `RideRequestScreen.js`: Displays incoming ride/parcel requests with full route paths (including stops) and counter-offer UI.
* `ActiveRideScreen.js`: Advanced navigation flow managing checkpoints (Arrived at Pickup -> Arrived at Stop 1 -> Complete Stop -> Destination).
* `CreateCarpoolScreen.js` / `ManageCarpoolsScreen.js` / `CarpoolExecutionScreen.js` / `DriverCarpoolRequestsScreen.js`: Driver-side carpool lifecycle management.
* `DriverIntercityScreen.js`: Intercity request management.
* `DriverRegistrationScreen.js`: Onboarding forms.
* `EarningsScreen.js`: Basic earnings display.

### Common/Shared Screens
* `ProfileScreen.js` / `SettingsScreen.js` / `HelpCenterScreen.js` / `AboutRaftar.js` / `Notifications.js`: Standard user management interfaces.
* `RideHistoryScreen.js`: Past rides display.
* `PaymentMethodsScreen.js` / `WalletScreen.js`: Financial configurations.
* `InCallScreen.js` / `IncomingCallScreen.js`: VoIP interface screens.
* `SharedRideViewScreen.js`: Unauthenticated web-ready live map tracking for guests.

## 3. Navigation
The app has recently migrated from a legacy `BottomTabNavigator` to a **Stack-Based Navigation** model for maximum screen real estate, utilizing a hamburger Sidebar Menu instead of bottom tabs.
* **Navigators:** `AuthNavigator`, `MainNavigator` (Wraps `PassengerNavigator` and `DriverNavigator`).
* **Typical Flow:** `HomeScreen` -> `BookRideScreen` -> `RideTrackingScreen`.
* **Driver Flow:** `DriverDashboardScreen` -> `RideRequestScreen` -> `ActiveRideScreen`.
* **Transitions:** Uses `TransitionPresets.SlideFromRightIOS` globally.

## 4. Vehicle Types
* **Bike** (1 Person)
* **Rickshaw** (3 Persons)
* **Car** (4 Persons)
* **AC Car** (4 Persons)
* **Luxury** (4 Persons)

## 5. Backend (APIs & Sockets)
* **Main API Routes (`server/routes/`):**
  * `authRoutes.js`, `adminRoutes.js`, `driverRoutes.js`, `rideRoutes.js`, `bookingRoutes.js`, `historyRoutes.js`, `parcelRoutes.js`, `paymentRoutes.js`, `ratingRoutes.js`, `callRoutes.js`.
* **Socket.IO Events (`server/config/socket.js`):**
  * **Listens:** `join-ride`, `driver-location`, `passenger-location`, `chat-message`, `sos-alert`.
  * **Emits:** `new-ride-request`, `ride-taken`, `bid-accepted`, `ride-cancelled`, `new-message`, `ride-completed`, `ride-accepted`, `counter-offer-received`, `ride-update`, `driver-location`, `passenger-location`, `sos-triggered`.

## 6. Current Theme / UI
* **Design System:** No global `theme.js` file; styles are localized within `StyleSheet.create` but rely heavily on shared constants.
* **Palette:** Yellow primary (`#F8B82A`, `#F9C349`), Teal for pickup/success (`#4ECDC4`), Coral for dropoff/danger (`#FF6B6B`), Orange for stops (`#FF9F43`), Dark gray/black for text.
* **Styling Tech:** Uses `LinearGradient` extensively for buttons/avatars and `react-native-animatable` for slide/fade mounting animations. Glassmorphism and modern border-radius paradigms are prevalent. No explicit dark mode context yet.

## 7. Known Issues
* **Critical UI Syntax Error:** `HomeScreen.js` currently has a Babel TransformError on line 643 (`Expected corresponding JSX closing tag for <SafeAreaView>`) which breaks the build.
* **Redux Missing Action:** Navigating to `PaymentMethodsScreen` throws `_reduxSlicesPaymentSlice.getPaymentMethods is not a function`, indicating a missing or misnamed export in the Redux slice.
* **Deprecated Components:** `SafeAreaView` from React Native core throws warnings; needs migration to `react-native-safe-area-context`.
* **Icon Warnings:** Numerous console warnings regarding invalid icon names (e.g., `car-cool`, `car-parking`, `twitter`) indicating mismatches with the installed `react-native-vector-icons` sets.
* **Expo Go Limitations:** Push notification features emit errors due to dropping support in Expo Go SDK 53 (requires development build).
