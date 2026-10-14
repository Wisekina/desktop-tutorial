import { t } from './i18n.js?v=participants-11';
import { ornamentLayout } from './ornaments.js';
const $ = id => document.getElementById(id);
let template, match;
function randomBelow(n) {
  const cutoff = Math.floor(4294967296/n)*n;
  let value;
  do { value = crypto.getRandomValues(new Uint32Array(1))[0]; } while(value>=cutoff);
  return value%n;
}
function exampleDraw() {
  let recipients;
  do {
    recipients = Array.from({length:25},(_,i)=>i);
    for(let i=24;i>0;i--){const j=randomBelow(i+1);[recipients[i],recipients[j]]=[recipients[j],recipients[i]];}
  } while(recipients.some((id,i)=>id===i));
  if(new Set(recipients).size!==25) throw new Error('Invalid demo draw');
  return recipients[0]+1;
}
async function init() {
  // Only static artwork is fetched. This page never imports the backend
  // configuration or sends registration/result requests to Supabase.
  const response = await fetch('./index.html'); if(!response.ok) throw new Error('Artwork unavailable');
  const doc = new DOMParser().parseFromString(await response.text(),'text/html');
  const snow = doc.querySelector('.snowfall'); if(snow) document.body.append(snow.cloneNode(true));
  const lights = doc.querySelector('.festive-lights'); if(lights) document.body.append(lights.cloneNode(true));
  const svg = doc.querySelector('.tree-art').cloneNode(true);
  const group = svg.querySelector('#ornaments');
  const colors = ['#db7561','#e5be64','#bca4c7','#e9e1c5','#9fbcad'];
  ornamentLayout(25).forEach(({x,y,r},i)=>{const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');for(const [key,value]of Object.entries({cx:x,cy:y,r,fill:colors[i%5]}))circle.setAttribute(key,value);group.append(circle);});
  $('demo-tree').append(svg);
  template = doc.querySelector('#reveal').cloneNode(true); template.removeAttribute('id'); template.hidden=false;
  $('demo-start').disabled=false;
}
function renderCard() {
  const card = template.cloneNode(true);
  card.querySelector('.postcard-title span').textContent=t('postcardTitle');
  card.querySelector('.postcard-hint span').textContent=t('postcardHint');
  card.addEventListener('click',()=>{$('demo-card').replaceChildren();$('demo-result').hidden=false;$('demo-recipient').textContent=t('demoPerson',{n:match});$('demo-message').textContent=t('demoVerified');});
  $('demo-card').replaceChildren(card);
}
$('demo-start').addEventListener('click',()=>{match=exampleDraw();$('demo-start').hidden=true;$('demo-result').hidden=true;$('demo-message').textContent=t('demoCard');renderCard();});
$('demo-again').addEventListener('click',()=>{$('demo-result').hidden=true;$('demo-start').hidden=false;$('demo-message').textContent='';});
window.addEventListener('app-language',()=>{if(match&&$('demo-card').children.length){renderCard();$('demo-message').textContent=t('demoCard');}if(!$('demo-result').hidden){$('demo-recipient').textContent=t('demoPerson',{n:match});$('demo-message').textContent=t('demoVerified');}});
init().catch(error=>{$('demo-message').textContent=error.message;});
