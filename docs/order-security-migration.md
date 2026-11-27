# Free-tier order creation and verification

## Why orders require admin approval

Firebase Cloud Functions deployment requires the Blaze billing plan. The storefront
therefore creates a limited order request directly in Firestore and does not call
`createCustomerOrder`.

New customer documents are created with `awaiting_admin_review`, zero totals, and no
payment reference. Firestore Rules reject customer-supplied non-zero totals and
prevent customers from changing the order contents or price after creation. An
authorized admin must load the current product catalog, verify product variants and
stock, and approve the request. The admin client then writes catalog-derived prices
under admin-only rules. VietQR details and the COD total are shown to the customer
only after approval.

This keeps the checkout on the free Firestore tier without treating browser-supplied
prices as trusted. The trade-off is manual admin approval before payment; automatic
server-side approval requires a billable backend such as Cloud Functions on Blaze.

## Access rules

- Customers can create only their own `VSI-<32 hex characters>` order request.
- Customer-created totals must be zero and the order starts in
  `Chờ duyệt giá và tồn kho`.
- Customers can read only known order IDs belonging to their account and can only
  mark an approved VietQR order as `awaiting_confirmation`.
- Only admins can list orders, approve requests using the current catalog, change
  fulfillment status, confirm/reject a reported payment, or delete an order.
- Direct client creation of a priced/approved order is denied.

Firestore Rules for this workflow were deployed to project `vsi2026`. No Functions,
Hosting, billing-plan, or product data changes are required.

## Manual verification

1. Sign in as a customer and place a COD or VietQR order. The receipt should say it
   is awaiting store review and must not show a QR or an amount yet.
2. In Admin, open the order and select **Xác nhận giá và tồn kho**. The app reloads
   the catalog from Firestore before deriving line prices, discounts, shipping, and
   the total.
3. Confirm the customer order history updates in real time. VietQR should then show
   the approved total and use the order number as the transfer reference; COD should
   show the approved total.
4. Report a VietQR payment and verify that the admin can mark it received or return
   it to pending with a note.
5. Confirm customer attempts to create a non-zero total or edit an existing order
   are denied by Firestore Rules.

The local Firebase Emulator requires Java on `PATH`; production Rules compilation
and deployment succeeded. The emulator flow was not run in this environment.
