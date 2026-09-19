# Notification Navigation QA

| Platform | State | Expected result | Result |
|---|---|---|---|
| Android | Foreground | Tap opens the matching item once | Not run |
| Android | Background | Tap opens the matching item once | Not run |
| Android | Terminated | App initializes, then opens the matching item once | Not run |
| iOS | Foreground | Tap opens the matching item once | Not run |
| iOS | Background | Tap opens the matching item once | Not run |
| iOS | Terminated | App initializes, then opens the matching item once | Not run |
| Both | Test notification | Tap does not navigate to an item | Not run |
| Both | Deleted item | Tap shows the existing Item Not Found state | Not run |
