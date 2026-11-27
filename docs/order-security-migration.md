# Free-tier order creation and verification

## Why orders require admin approval

Firebase Cloud Functions deployment requires the Blaze billing plan. The storefront
therefore creates a limited order request directly in Firestore and does not call
`createCustomerOrder`.

New order documents are created with `awaiting_admin_review` and zero trusted
totals. VietQR orders immediately show a QR using the checkout's quoted amount and
the order number as the transfer reference. The quote is explicitly untrusted; an
authorized admin must load the current product catalog, verify variants and stock,
and compare the actual bank transfer before marking payment successful. The admin
client writes catalog-derived prices under admin-only rules. COD orders show the
confirmed total only after admin approval.

This keeps the checkout on the free Firestore tier without treating browser-supplied
prices as trusted. Customers can report that they transferred money before price
approval; the admin then verifies the order and bank credit. Automatic server-side
price approval requires a billable backend such as Cloud Functions on Blaze.

## Access rules

- Customers can create only their own `VSI-<32 hex characters>` order request.
- Customer-created totals must be zero and the order starts in
  `Chờ duyệt giá và tồn kho`.
- Customers can read only known order IDs belonging to their account and can only
  report a VietQR transfer by moving it to `awaiting_confirmation`.
- Only admins can list orders, approve requests using the current catalog, change
  fulfillment status, confirm/reject a reported payment, or delete an order.
- Direct client creation of a priced/approved order is denied.

Firestore Rules for this workflow were deployed to project `vsi2026`. No Functions,
Hosting, billing-plan, or product data changes are required.

## Manual verification

1. Sign in as a customer and place a VietQR order. Confirm that the QR appears
   immediately with the order number as transfer reference and the checkout quote.
2. Press **Tôi đã thanh toán**. Confirm that the order updates in the admin view in
   real time and shows that the customer reported a transfer.
3. In Admin, select **Xác nhận giá và tồn kho**. The app reloads the catalog from
   Firestore, derives trusted line prices and totals, and displays a warning if the
   verified total differs from the QR quote.
4. Check the bank account. Only then mark the payment received, or return it to
   pending with a note. Verify the customer sees the green paid status after the
   admin update.
5. Test COD separately: it remains unpriced until admin approval. Confirm that
   customer attempts to create a non-zero trusted total or edit an existing order
   are denied by Firestore Rules.

The local Firebase Emulator requires Java on `PATH`; production Rules compilation
and deployment succeeded. The emulator flow was not run in this environment.
