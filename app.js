const { createClient } = window.supabase;
const sb = createClient(SHOP_CONFIG.SUPABASE_URL, SHOP_CONFIG.SUPABASE_PUBLISHABLE_KEY);

const productsEl = document.getElementById('products');
const modal = document.getElementById('orderModal');
const orderForm = document.getElementById('orderForm');
let catalog = [];

function money(v){ return `৳${Number(v).toLocaleString('en-BD')}`; }

async function loadProducts(){
  const {data: products, error} = await sb.from('products').select('*').eq('active',true).order('created_at',{ascending:false});
  if(error){ productsEl.innerHTML = `<div class="panel">Product load error: ${escapeHtml(error.message)}</div>`; return; }
  const ids = products.map(p=>p.id);
  let variants=[], sizes=[];
  if(ids.length){
    const vr = await sb.from('product_variants').select('*').in('product_id',ids).eq('active',true).order('created_at');
    variants = vr.data || [];
    const vids = variants.map(v=>v.id);
    if(vids.length){
      const sr = await sb.from('variant_sizes').select('*').in('variant_id',vids).eq('active',true).order('created_at');
      sizes = sr.data || [];
    }
  }
  catalog = products.map(p=>({
    ...p,
    variants: variants.filter(v=>v.product_id===p.id).map(v=>({...v,sizes:sizes.filter(s=>s.variant_id===v.id)}))
  }));
  renderProducts();
}
function renderProducts(){
  if(!catalog.length){productsEl.innerHTML='<div class="panel">এখনো কোনো product যোগ করা হয়নি।</div>';return;}
  productsEl.innerHTML=catalog.map(p=>{
    const variants=p.variants.length?p.variants:[{id:null,name:'Default',image_url:p.main_image_url,sizes:[{id:null,size:'Default',price:p.base_price||0,stock:999999}]}];
    return `<article class="card">
      <img src="${escapeAttr(p.main_image_url||'https://placehold.co/600x600?text=Product')}" alt="">
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.description||'')}</p>
      <select class="select variant-select" data-p="${p.id}">${variants.map(v=>`<option value="${v.id}">${escapeHtml(v.name)}</option>`).join('')}</select>
      <select class="select size-select" data-p="${p.id}"></select>
      <div class="price" id="price-${p.id}"></div>
      <button class="primary order-btn" data-p="${p.id}">Order Now</button>
    </article>`;
  }).join('');
  catalog.forEach(p=>updateVariantUI(p.id));
  productsEl.querySelectorAll('.variant-select').forEach(e=>e.addEventListener('change',()=>updateVariantUI(Number(e.dataset.p))));
  productsEl.querySelectorAll('.size-select').forEach(e=>e.addEventListener('change',()=>updatePrice(Number(e.dataset.p))));
  productsEl.querySelectorAll('.order-btn').forEach(e=>e.addEventListener('click',()=>openOrder(Number(e.dataset.p))));
}
function selectedVariant(p){
  const vId = document.querySelector(`.variant-select[data-p="${p.id}"]`).value;
  return p.variants.find(v=>String(v.id)===String(vId)) || p.variants[0];
}
function updateVariantUI(pid){
  const p=catalog.find(x=>x.id===pid); const v=selectedVariant(p);
  const sizeEl=document.querySelector(`.size-select[data-p="${pid}"]`);
  sizeEl.innerHTML=(v?.sizes||[]).map(s=>`<option value="${s.id}">${escapeHtml(s.size)} — ${money(s.price)} (${s.stock} left)</option>`).join('');
  updatePrice(pid);
}
function updatePrice(pid){
  const p=catalog.find(x=>x.id===pid); const v=selectedVariant(p);
  const sid=document.querySelector(`.size-select[data-p="${pid}"]`)?.value;
  const s=(v?.sizes||[]).find(x=>String(x.id)===String(sid)) || v?.sizes?.[0];
  document.getElementById(`price-${pid}`).textContent=s?money(s.price):'দাম সেট করা হয়নি';
}
function openOrder(pid){
  const p=catalog.find(x=>x.id===pid); const v=selectedVariant(p);
  const sid=document.querySelector(`.size-select[data-p="${pid}"]`).value;
  const s=(v.sizes||[]).find(x=>String(x.id)===String(sid));
  if(!s){alert('এই product-এর size/price এখনো সেট করা হয়নি।');return;}
  document.getElementById('productName').value=p.name;
  document.getElementById('variantName').value=v.name;
  document.getElementById('sizeName').value=s.size;
  document.getElementById('unitPrice').value=s.price;
  document.getElementById('quantity').value=1;
  document.getElementById('selectedProduct').textContent=`${p.name} — ${v.name} — ${s.size} — ${money(s.price)}`;
  updateOrderTotal();
  modal.classList.remove('hidden');
}
function updateOrderTotal(){
  const q=Number(document.getElementById('quantity').value||1), price=Number(document.getElementById('unitPrice').value||0);
  document.getElementById('orderTotal').textContent=`Product Total: ${money(q*price)}`;
}
document.getElementById('quantity').addEventListener('input',updateOrderTotal);
document.getElementById('closeModal').onclick=()=>modal.classList.add('hidden');

orderForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const q=Number(document.getElementById('quantity').value), price=Number(document.getElementById('unitPrice').value);
  const {error}=await sb.from('orders').insert({
    customer_name:document.getElementById('customerName').value.trim(),
    phone:document.getElementById('phone').value.trim(),
    address:document.getElementById('address').value.trim(),
    district:document.getElementById('district').value.trim(),
    upazila:document.getElementById('upazila').value.trim(),
    product_name:document.getElementById('productName').value,
    variety:document.getElementById('variantName').value,
    size:document.getElementById('sizeName').value,
    quantity:q, product_price:price, delivery_charge:0, total_price:q*price
  });
  const msg=document.getElementById('orderMessage');
  if(error){msg.textContent='অর্ডার হয়নি: '+error.message;return;}
  msg.textContent='অর্ডার সফল হয়েছে।';
  orderForm.reset(); document.getElementById('quantity').value=1;
});
function escapeHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function escapeAttr(s){return escapeHtml(s);}
loadProducts();
