# Trusted order creation

## Rules baseline

The rules before this change are preserved in Git at commit `b89c1e3`:

```powershell
git show b89c1e3:firestore.rules
```

The former `orders` create rule allowed authenticated customers to write client-supplied prices and totals. New orders are now created by the `createCustomerOrder` callable, which derives prices and totals from Firestore products. Direct client order creation is denied. Reads and the existing admin-only status updates remain governed by the active rules.

## Local emulator checks

The Firebase CLI emulator suite requires a Java runtime available on `PATH`.

1. Set these values in an untracked `.env.local` file:

   ```text
   VITE_USE_FIREBASE_EMULATORS=true
   VITE_FIREBASE_PROJECT_ID=demo-vsi
   ```

2. Start the emulators from the repository root:

   ```powershell
   firebase emulators:start --project demo-vsi --only auth,firestore,functions
   ```

3. In a second terminal, start the app with `npm run dev`. Register or sign in using the Auth Emulator, seed a product and variant in the Firestore Emulator, then place an order.
4. Verify the callable creates an order whose item prices and totals match the emulator product data. Try creating an order directly through the Firestore client; it should be denied. Confirm the customer can read only their own order and an admin can still update order status.
5. Run the existing function unit tests:

   ```powershell
   npm --prefix functions test
   ```

No Rules or Functions deployment was performed.
