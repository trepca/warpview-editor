(window.webpackJsonp=window.webpackJsonp||[]).push([[12],{eLOS:function(t,s,e){"use strict";e.r(s),e.d(s,"scopeCss",(function(){return C}));const o=")(?:\\(((?:\\([^)(]*\\)|[^)(]*)+?)\\))?([^,{]*)",n=new RegExp("(-shadowcsshost"+o,"gim"),c=new RegExp("(-shadowcsscontext"+o,"gim"),r=new RegExp("(-shadowcssslotted"+o,"gim"),a=/-shadowcsshost-no-combinator([^\s]*)/,l=[/::shadow/g,/::content/g],h=/-shadowcsshost/gim,i=/:host/gim,p=/::slotted/gim,d=/:host-context/gim,u=/\/\*\s*[\s\S]*?\*\//g,g=/\/\*\s*#\s*source(Mapping)?URL=[\s\S]+?\*\//g,m=/(\s*)([^;\{\}]+?)(\s*)((?:{%BLOCK%}?\s*;?)|(?:\s*;))/g,w=/([{}])/g,f=(t,s)=>{const e=_(t);let o=0;return e.escapedString.replace(m,(...t)=>{const n=t[2];let c="",r=t[4],a="";r&&r.startsWith("{%BLOCK%")&&(c=e.blocks[o++],r=r.substring("%BLOCK%".length+1),a="{");const l=s({selector:n,content:c});return`${t[1]}${l.selector}${t[3]}${a}${l.content}${r}`})},_=t=>{const s=t.split(w),e=[],o=[];let n=0,c=[];for(let r=0;r<s.length;r++){const t=s[r];"}"===t&&n--,n>0?c.push(t):(c.length>0&&(o.push(c.join("")),e.push("%BLOCK%"),c=[]),e.push(t)),"{"===t&&n++}return c.length>0&&(o.push(c.join("")),e.push("%BLOCK%")),{escapedString:e.join(""),blocks:o}},x=(t,s,e)=>t.replace(s,(...t)=>{if(t[2]){const s=t[2].split(","),o=[];for(let n=0;n<s.length;n++){const c=s[n].trim();if(!c)break;o.push(e("-shadowcsshost-no-combinator",c,t[3]))}return o.join(",")}return"-shadowcsshost-no-combinator"+t[3]}),b=(t,s,e)=>t+s.replace("-shadowcsshost","")+e,$=(t,s,e)=>s.indexOf("-shadowcsshost")>-1?b(t,s,e):t+s+e+", "+s+" "+t+e,O=(t,s)=>{return!(t=>{return t=t.replace(/\[/g,"\\[").replace(/\]/g,"\\]"),new RegExp("^("+t+")([>\\s~+[.,{:][\\s\\S]*)?$","m")})(s).test(t)},W=(t,s,e)=>{const o="."+(s=s.replace(/\[is=([^\]]*)\]/g,(t,...s)=>s[0])),n=t=>{let n=t.trim();if(!n)return"";if(t.indexOf("-shadowcsshost-no-combinator")>-1)n=((t,s,e)=>{if(h.lastIndex=0,h.test(t)){const s=`.${e}`;return t.replace(a,(t,e)=>e.replace(/([^:]*)(:*)(.*)/,(t,e,o,n)=>e+s+o+n)).replace(h,s+" ")}return s+" "+t})(t,s,e);else{const s=t.replace(h,"");if(s.length>0){const t=s.match(/([^:]*)(:*)(.*)/);t&&(n=t[1]+o+t[2]+t[3])}}return n},c=(t=>{const s=[];let e,o=0;return{content:e=(t=t.replace(/(\[[^\]]*\])/g,(t,e)=>{const n=`__ph-${o}__`;return s.push(e),o++,n})).replace(/(:nth-[-\w]+)(\([^)]+\))/g,(t,e,n)=>{const c=`__ph-${o}__`;return s.push(n),o++,e+c}),placeholders:s}})(t);let r,l="",i=0;const p=/( |>|\+|~(?!=))\s*/g;let d=!((t=c.content).indexOf("-shadowcsshost-no-combinator")>-1);for(;null!==(r=p.exec(t));){const s=r[1],e=t.slice(i,r.index).trim();l+=`${(d=d||e.indexOf("-shadowcsshost-no-combinator")>-1)?n(e):e} ${s} `,i=p.lastIndex}const u=t.substring(i);return l+=(d=d||u.indexOf("-shadowcsshost-no-combinator")>-1)?n(u):u,((t,s)=>s.replace(/__ph-(\d+)__/g,(s,e)=>t[+e]))(c.placeholders,l)},L=(t,s,e,o,n)=>f(t,t=>{let n=t.selector,c=t.content;return"@"!==t.selector[0]?n=((t,s,e,o)=>t.split(",").map(t=>o&&t.indexOf("."+o)>-1?t.trim():O(t,s)?W(t,s,e).trim():t.trim()).join(", "))(t.selector,s,e,o):(t.selector.startsWith("@media")||t.selector.startsWith("@supports")||t.selector.startsWith("@page")||t.selector.startsWith("@document"))&&(c=L(t.content,s,e,o)),{selector:n.replace(/\s{2,}/g," ").trim(),content:c}}),j=(t,s,e,o,a)=>(t=(t=>l.reduce((t,s)=>t.replace(s," "),t))(t=((t,s)=>{const e=r;return t.replace(e,(...t)=>{if(t[2]){const e=t[2].trim(),o=t[3];return"."+s+" > "+e+o}return"-shadowcsshost-no-combinator"+t[3]})})(t=(t=>x(t,c,$))(t=(t=>x(t,n,b))(t=(t=>t=t.replace(d,"-shadowcsscontext").replace(i,"-shadowcsshost").replace(p,"-shadowcssslotted"))(t))),o)),s&&(t=L(t,s,e,o)),(t=(t=t.replace(/-shadowcsshost-no-combinator/g,`.${e}`)).replace(/>\s*\*\s+([^{, ]+)/gm," $1 ")).trim()),C=(t,s,e)=>{const o=s+"-h",n=s+"-s",c=(t=>t.match(g)||[])(t);t=(t=>t.replace(u,""))(t);const r=[];if(e){const s=t=>{const s=`/*!@___${r.length}___*/`,e=`/*!@${t.selector}*/`;return r.push({placeholder:s,comment:e}),t.selector=s+t.selector,t};t=f(t,t=>"@"!==t.selector[0]?s(t):t.selector.startsWith("@media")||t.selector.startsWith("@supports")||t.selector.startsWith("@page")||t.selector.startsWith("@document")?(t.content=f(t.content,s),t):t)}const a=j(t,s,o,n);return t=[a,...c].join("\n"),e&&r.forEach(({placeholder:s,comment:e})=>{t=t.replace(s,e)}),t}}}]);