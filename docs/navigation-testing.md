# Navigation and Settings phone checks

Use the current Android development or release build with the JavaScript debugger disconnected. Browser previews cannot verify native stack animations or Android system back gestures.

- Open Settings from Home, scroll down, open Archived reminders, then go back twice. Repeat using the header back button and Android system back. On Android, each page should use a brief native fade without a background flash or a pause, and Settings should retain its scroll position.
- Open a reminder from each main tab, then return. The original tab, filters, selected calendar date, and scroll position should remain intact.
- Open New Reminder, show the keyboard, then return using Cancel and Android system back. Confirm the keyboard and page leave cleanly.
- Try repeated open/back navigation in Light, Dark, and System appearance. Change the device theme while System is selected.
- Enable the device Reduce motion / Remove animations setting and repeat navigation. Stack animations should be disabled. Turn it off and confirm the brief transition returns.
- Leave the app in the background across midnight. On return, Home date and reminder statuses should show the current day.
- In Settings, send a 10-second notification test and background the app.
- Save a backup to a private folder, choose it, review the preview, and cancel. Choose it again and restore; existing matching reminders should be skipped. Check both cancelled pickers return to Settings without an error.

If a hitch remains, record the exact opening screen, destination, back method, whether the keyboard was open, device model, and build type. Compare a release build with the development build before attributing the delay to the animation itself.
