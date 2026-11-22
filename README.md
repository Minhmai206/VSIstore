<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# VSI store

## Run locally

1. Install dependencies with `npm install`.
2. The VSI Firebase web app configuration is included in
   `src/services/firebaseConfig.ts`. Optional `.env` values can override it for
   another Firebase project.
3. In Firebase Console, enable **Authentication → Email/Password** and create a
   Firestore database.
4. Run `npm run dev`.

Customer registration stores the customer's name, phone, address, and email in
the Firestore `customers` collection. Customers must sign in before placing an
order; orders are stored with their Firebase UID so they can privately view
their own purchase history and delivery status. Products are publicly readable;
product edits and manual order status changes require an administrator. The
administrator manually verifies bank transfers and confirms payment in the
dashboard. In Spark mode, signed-in customers create orders directly in
Firestore under restrictive rules; the browser calculates the displayed total,
so admins must verify the order contents and amount before confirming payment.
The first administrator sign-in initializes the default product catalog if
Firestore has no products yet. Make sure that initialization has completed
before accepting customer orders.

## Firestore access and administrator setup

The project includes restrictive rules in `firestore.rules`, with
`firebase.json` and `.firebaserc` targeting the `vsi2026` project. Review the
rules before publishing them with the Firebase CLI:

```sh
firebase login
```

To grant administrator access:

1. In **Firebase Console → Authentication**, create an administrator user
   using an email address you control and a strong password.
2. Copy that user's Firebase UID.
3. In **Firestore Database**, create `admins/{UID}` with the string field
   `role` set to `admin`. Do this in the Console; application clients cannot
   create or edit administrator records.
4. Sign in to the website's admin form using that Firebase email and password.

The former `admin` / `123456` browser-only login has been removed. It could not
securely authorize Firestore writes. Customers can only access their own
profiles and orders; administrators are explicitly registered in Firestore.

Checkout supports cash-on-delivery and VietQR bank transfer. To show a real
payment QR, set `VITE_VIETQR_BANK_BIN`, `VITE_VIETQR_BANK_NAME`,
`VITE_VIETQR_ACCOUNT_NUMBER`, and `VITE_VIETQR_ACCOUNT_NAME` in `.env`, then
restart the development server. A VietQR image alone does not confirm that
money arrived.

To embed the workshop video, set `VITE_CRAFT_VIDEO_URL` in `.env` to a YouTube,
Vimeo, or direct MP4/WebM/OGG URL, then rebuild and redeploy the site.

## Manual VietQR payment (Spark plan)

Customers can place an order, scan the QR, and transfer without any SePay
account or webhook. The order remains **Chờ xác nhận thanh toán** until an
administrator checks the bank account and clicks **Xác nhận đã nhận chuyển
khoản** in the admin dashboard. Keep the admin dashboard open to receive new
orders in real time. Customers who are signed in receive an in-page notice
while the site is open, and the payment and delivery statuses remain available
in order history when they return.

This mode does not require SePay, Cloud Functions, or the Blaze plan. Firestore
Rules restrict who may create an order and who may confirm its payment, but
they cannot verify the browser-calculated product prices. The admin must check
the product list and total against the bank transfer before confirming. For
server-verified prices, the project would need Cloud Functions on Blaze.

From the project root:

1. Sign in to Firebase CLI:

   ```sh
   firebase login
   ```

2. Deploy Firestore Rules:

   ```sh
   firebase deploy --only firestore:rules
   ```

3. Rebuild and redeploy the frontend with your website host.

The QR appears after the order is saved. Verify the transfer in the bank app
before confirming it in the dashboard.

Card, MoMo, and VNPay processing require separate provider integrations.
