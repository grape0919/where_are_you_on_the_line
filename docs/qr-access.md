# QR Access for Patient Queue

After a patient is registered, the register page generates a QR code that encodes the patient queue URL.

## UX

- On successful registration, the UI shows:
  - Queue link (copy/open)
  - **QR image**
  - Buttons under the QR:
    - **Copy image**
    - **Download**

## Implementation

- QR generation happens in the client after `successData` is set.
- The QR encodes a full URL:
  - `${window.location.origin}${queueUrl}`

## Copy / Download behavior

- **Copy image** uses the Clipboard API with PNG blobs when supported.
  - If image copy is not supported, it falls back to copying the queue URL.
- **Download** saves a PNG file named `queue-qr-<TOKEN>.png`.

## Dependency

- Uses the `qrcode` package to generate a PNG data URL.


