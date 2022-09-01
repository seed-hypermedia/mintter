# TODOs

- [refactor]: refactor wallet machines to typegen
- lndhub
  - fetch the wallets from the authg machine
  - add pasphrase to the nboarding
  - now we can get different amounts of mnemonics: 12 (default), 15, 18, 24
  - change wallet nickname flow
  - topup flow
    - same as create invoice but with the same user id account
    - show QR to topup from outside
  - payment flow:
    - select amount and pay
  - list of invoices
  - filter list of invoices by: wallet, payment status, expiration...
  - show lnaddress
  - show invoices status per document?
  - add block metadata to invoices so we can overlay all the payment info on each document
- [bug]: when clicking nested transclusions it opens both documents?
