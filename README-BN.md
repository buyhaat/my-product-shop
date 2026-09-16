# My Product Shop

এটি একটি dynamic product-order website-এর প্রথম version।

## যা আছে
- Customer product page
- Variety এবং size নির্বাচন
- Size অনুযায়ী price ও stock
- Order form
- Supabase database
- Supabase Auth দিয়ে admin login
- Admin থেকে product/variety/size/price/stock manage
- Supabase Storage-এ product image upload

## প্রথমে যা করতে হবে
1. `config.js` খুলে `SUPABASE_PUBLISHABLE_KEY`-এর জায়গায় আপনার Supabase Publishable key বসান।
2. `index.html` ও `admin.html` একই folder-এ রাখুন।
3. GitHub-এ upload করে Vercel-এ deploy করুন।

## গুরুত্বপূর্ণ
`service_role` বা `sb_secret_...` key কখনো `config.js`-এ দেবেন না।

## বর্তমান order delivery charge
প্রথম version-এ delivery charge 0 রাখা হয়েছে। পরে আপনার নিয়ম অনুযায়ী delivery charge যোগ করা যাবে।
