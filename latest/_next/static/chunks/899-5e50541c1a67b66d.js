"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[899],{588:(e,t,n)=>{n.d(t,{UC:()=>e8,YJ:()=>te,q7:()=>tt,ZL:()=>e9,bL:()=>e6,wv:()=>tn,l9:()=>e7});var r=n(4364),i=n(1026),o=n(272),a=n(5788),s=n(8451),l=n(9642),c=n(5346),u=n(5833),d=n(2284),f=n(1141),p=n(6709),h=n(9843),v=n(6906),m=n(3630),g=n(3404),b=n(8867),y=n(6496),w="rovingFocusGroup.onEntryFocus",x={bubbles:!1,cancelable:!0},E="RovingFocusGroup",[_,S,M]=(0,c.N)(E),[O,j]=(0,a.A)(E,[M]),[A,C]=O(E),P=r.forwardRef((e,t)=>(0,y.jsx)(_.Provider,{scope:e.__scopeRovingFocusGroup,children:(0,y.jsx)(_.Slot,{scope:e.__scopeRovingFocusGroup,children:(0,y.jsx)(T,{...e,ref:t})})}));P.displayName=E;var T=r.forwardRef((e,t)=>{let{__scopeRovingFocusGroup:n,orientation:a,loop:c=!1,dir:d,currentTabStopId:f,defaultCurrentTabStopId:p,onCurrentTabStopIdChange:h,onEntryFocus:v,preventScrollOnEntryFocus:m=!1,...g}=e,_=r.useRef(null),M=(0,o.s)(t,_),O=(0,u.jH)(d),[j,C]=(0,s.i)({prop:f,defaultProp:null!=p?p:null,onChange:h,caller:E}),[P,T]=r.useState(!1),L=(0,b.c)(v),D=S(n),R=r.useRef(!1),[I,z]=r.useState(0);return r.useEffect(()=>{let e=_.current;if(e)return e.addEventListener(w,L),()=>e.removeEventListener(w,L)},[L]),(0,y.jsx)(A,{scope:n,orientation:a,dir:O,loop:c,currentTabStopId:j,onItemFocus:r.useCallback(e=>C(e),[C]),onItemShiftTab:r.useCallback(()=>T(!0),[]),onFocusableItemAdd:r.useCallback(()=>z(e=>e+1),[]),onFocusableItemRemove:r.useCallback(()=>z(e=>e-1),[]),children:(0,y.jsx)(l.sG.div,{tabIndex:P||0===I?-1:0,"data-orientation":a,...g,ref:M,style:{outline:"none",...e.style},onMouseDown:(0,i.mK)(e.onMouseDown,()=>{R.current=!0}),onFocus:(0,i.mK)(e.onFocus,e=>{let t=!R.current;if(e.target===e.currentTarget&&t&&!P){let t=new CustomEvent(w,x);if(e.currentTarget.dispatchEvent(t),!t.defaultPrevented){let e=D().filter(e=>e.focusable);k([e.find(e=>e.active),e.find(e=>e.id===j),...e].filter(Boolean).map(e=>e.ref.current),m)}}R.current=!1}),onBlur:(0,i.mK)(e.onBlur,()=>T(!1))})})}),L="RovingFocusGroupItem",D=r.forwardRef((e,t)=>{let{__scopeRovingFocusGroup:n,focusable:o=!0,active:a=!1,tabStopId:s,children:c,...u}=e,d=(0,h.B)(),f=s||d,p=C(L,n),v=p.currentTabStopId===f,m=S(n),{onFocusableItemAdd:g,onFocusableItemRemove:b,currentTabStopId:w}=p;return r.useEffect(()=>{if(o)return g(),()=>b()},[o,g,b]),(0,y.jsx)(_.ItemSlot,{scope:n,id:f,focusable:o,active:a,children:(0,y.jsx)(l.sG.span,{tabIndex:v?0:-1,"data-orientation":p.orientation,...u,ref:t,onMouseDown:(0,i.mK)(e.onMouseDown,e=>{o?p.onItemFocus(f):e.preventDefault()}),onFocus:(0,i.mK)(e.onFocus,()=>p.onItemFocus(f)),onKeyDown:(0,i.mK)(e.onKeyDown,e=>{if("Tab"===e.key&&e.shiftKey)return void p.onItemShiftTab();if(e.target!==e.currentTarget)return;let t=function(e,t,n){var r;let i=(r=e.key,"rtl"!==n?r:"ArrowLeft"===r?"ArrowRight":"ArrowRight"===r?"ArrowLeft":r);if(!("vertical"===t&&["ArrowLeft","ArrowRight"].includes(i))&&!("horizontal"===t&&["ArrowUp","ArrowDown"].includes(i)))return R[i]}(e,p.orientation,p.dir);if(void 0!==t){if(e.metaKey||e.ctrlKey||e.altKey||e.shiftKey)return;e.preventDefault();let n=m().filter(e=>e.focusable).map(e=>e.ref.current);if("last"===t)n.reverse();else if("prev"===t||"next"===t){"prev"===t&&n.reverse();let r=n.indexOf(e.currentTarget);n=p.loop?function(e,t){return e.map((n,r)=>e[(t+r)%e.length])}(n,r+1):n.slice(r+1)}setTimeout(()=>k(n))}}),children:"function"==typeof c?c({isCurrentTabStop:v,hasTabStop:null!=w}):c})})});D.displayName=L;var R={ArrowLeft:"prev",ArrowUp:"prev",ArrowRight:"next",ArrowDown:"next",PageUp:"first",Home:"first",PageDown:"last",End:"last"};function k(e){let t=arguments.length>1&&void 0!==arguments[1]&&arguments[1],n=document.activeElement;for(let r of e)if(r===n||(r.focus({preventScroll:t}),document.activeElement!==n))return}var I=n(7832),z=n(4822),U=n(4685),F=["Enter"," "],N=["ArrowUp","PageDown","End"],B=["ArrowDown","PageUp","Home",...N],H={ltr:[...F,"ArrowRight"],rtl:[...F,"ArrowLeft"]},q={ltr:["ArrowLeft"],rtl:["ArrowRight"]},Y="Menu",[G,W,X]=(0,c.N)(Y),[K,V]=(0,a.A)(Y,[X,v.Bk,j]),$=(0,v.Bk)(),Z=j(),[Q,J]=K(Y),[ee,et]=K(Y),en=e=>{let{__scopeMenu:t,open:n=!1,children:i,dir:o,onOpenChange:a,modal:s=!0}=e,l=$(t),[c,d]=r.useState(null),f=r.useRef(!1),p=(0,b.c)(a),h=(0,u.jH)(o);return r.useEffect(()=>{let e=()=>{f.current=!0,document.addEventListener("pointerdown",t,{capture:!0,once:!0}),document.addEventListener("pointermove",t,{capture:!0,once:!0})},t=()=>f.current=!1;return document.addEventListener("keydown",e,{capture:!0}),()=>{document.removeEventListener("keydown",e,{capture:!0}),document.removeEventListener("pointerdown",t,{capture:!0}),document.removeEventListener("pointermove",t,{capture:!0})}},[]),(0,y.jsx)(v.bL,{...l,children:(0,y.jsx)(Q,{scope:t,open:n,onOpenChange:p,content:c,onContentChange:d,children:(0,y.jsx)(ee,{scope:t,onClose:r.useCallback(()=>p(!1),[p]),isUsingKeyboardRef:f,dir:h,modal:s,children:i})})})};en.displayName=Y;var er=r.forwardRef((e,t)=>{let{__scopeMenu:n,...r}=e,i=$(n);return(0,y.jsx)(v.Mz,{...i,...r,ref:t})});er.displayName="MenuAnchor";var ei="MenuPortal",[eo,ea]=K(ei,{forceMount:void 0}),es=e=>{let{__scopeMenu:t,forceMount:n,children:r,container:i}=e,o=J(ei,t);return(0,y.jsx)(eo,{scope:t,forceMount:n,children:(0,y.jsx)(g.C,{present:n||o.open,children:(0,y.jsx)(m.Z,{asChild:!0,container:i,children:r})})})};es.displayName=ei;var el="MenuContent",[ec,eu]=K(el),ed=r.forwardRef((e,t)=>{let n=ea(el,e.__scopeMenu),{forceMount:r=n.forceMount,...i}=e,o=J(el,e.__scopeMenu),a=et(el,e.__scopeMenu);return(0,y.jsx)(G.Provider,{scope:e.__scopeMenu,children:(0,y.jsx)(g.C,{present:r||o.open,children:(0,y.jsx)(G.Slot,{scope:e.__scopeMenu,children:a.modal?(0,y.jsx)(ef,{...i,ref:t}):(0,y.jsx)(ep,{...i,ref:t})})})})}),ef=r.forwardRef((e,t)=>{let n=J(el,e.__scopeMenu),a=r.useRef(null),s=(0,o.s)(t,a);return r.useEffect(()=>{let e=a.current;if(e)return(0,z.Eq)(e)},[]),(0,y.jsx)(ev,{...e,ref:s,trapFocus:n.open,disableOutsidePointerEvents:n.open,disableOutsideScroll:!0,onFocusOutside:(0,i.mK)(e.onFocusOutside,e=>e.preventDefault(),{checkForDefaultPrevented:!1}),onDismiss:()=>n.onOpenChange(!1)})}),ep=r.forwardRef((e,t)=>{let n=J(el,e.__scopeMenu);return(0,y.jsx)(ev,{...e,ref:t,trapFocus:!1,disableOutsidePointerEvents:!1,disableOutsideScroll:!1,onDismiss:()=>n.onOpenChange(!1)})}),eh=(0,I.TL)("MenuContent.ScrollLock"),ev=r.forwardRef((e,t)=>{let{__scopeMenu:n,loop:a=!1,trapFocus:s,onOpenAutoFocus:l,onCloseAutoFocus:c,disableOutsidePointerEvents:u,onEntryFocus:h,onEscapeKeyDown:m,onPointerDownOutside:g,onFocusOutside:b,onInteractOutside:w,onDismiss:x,disableOutsideScroll:E,..._}=e,S=J(el,n),M=et(el,n),O=$(n),j=Z(n),A=W(n),[C,T]=r.useState(null),L=r.useRef(null),D=(0,o.s)(t,L,S.onContentChange),R=r.useRef(0),k=r.useRef(""),I=r.useRef(0),z=r.useRef(null),F=r.useRef("right"),H=r.useRef(0),q=E?U.A:r.Fragment;r.useEffect(()=>()=>window.clearTimeout(R.current),[]),(0,f.Oh)();let Y=r.useCallback(e=>{var t,n;return F.current===(null==(t=z.current)?void 0:t.side)&&function(e,t){return!!t&&function(e,t){let{x:n,y:r}=e,i=!1;for(let e=0,o=t.length-1;e<t.length;o=e++){let a=t[e],s=t[o],l=a.x,c=a.y,u=s.x,d=s.y;c>r!=d>r&&n<(u-l)*(r-c)/(d-c)+l&&(i=!i)}return i}({x:e.clientX,y:e.clientY},t)}(e,null==(n=z.current)?void 0:n.area)},[]);return(0,y.jsx)(ec,{scope:n,searchRef:k,onItemEnter:r.useCallback(e=>{Y(e)&&e.preventDefault()},[Y]),onItemLeave:r.useCallback(e=>{var t;Y(e)||(null==(t=L.current)||t.focus(),T(null))},[Y]),onTriggerLeave:r.useCallback(e=>{Y(e)&&e.preventDefault()},[Y]),pointerGraceTimerRef:I,onPointerGraceIntentChange:r.useCallback(e=>{z.current=e},[]),children:(0,y.jsx)(q,{...E?{as:eh,allowPinchZoom:!0}:void 0,children:(0,y.jsx)(p.n,{asChild:!0,trapped:s,onMountAutoFocus:(0,i.mK)(l,e=>{var t;e.preventDefault(),null==(t=L.current)||t.focus({preventScroll:!0})}),onUnmountAutoFocus:c,children:(0,y.jsx)(d.qW,{asChild:!0,disableOutsidePointerEvents:u,onEscapeKeyDown:m,onPointerDownOutside:g,onFocusOutside:b,onInteractOutside:w,onDismiss:x,children:(0,y.jsx)(P,{asChild:!0,...j,dir:M.dir,orientation:"vertical",loop:a,currentTabStopId:C,onCurrentTabStopIdChange:T,onEntryFocus:(0,i.mK)(h,e=>{M.isUsingKeyboardRef.current||e.preventDefault()}),preventScrollOnEntryFocus:!0,children:(0,y.jsx)(v.UC,{role:"menu","aria-orientation":"vertical","data-state":eB(S.open),"data-radix-menu-content":"",dir:M.dir,...O,..._,ref:D,style:{outline:"none",..._.style},onKeyDown:(0,i.mK)(_.onKeyDown,e=>{let t=e.target.closest("[data-radix-menu-content]")===e.currentTarget,n=e.ctrlKey||e.altKey||e.metaKey,r=1===e.key.length;t&&("Tab"===e.key&&e.preventDefault(),!n&&r&&(e=>{var t,n;let r=k.current+e,i=A().filter(e=>!e.disabled),o=document.activeElement,a=null==(t=i.find(e=>e.ref.current===o))?void 0:t.textValue,s=function(e,t,n){var r;let i=t.length>1&&Array.from(t).every(e=>e===t[0])?t[0]:t,o=n?e.indexOf(n):-1,a=(r=Math.max(o,0),e.map((t,n)=>e[(r+n)%e.length]));1===i.length&&(a=a.filter(e=>e!==n));let s=a.find(e=>e.toLowerCase().startsWith(i.toLowerCase()));return s!==n?s:void 0}(i.map(e=>e.textValue),r,a),l=null==(n=i.find(e=>e.textValue===s))?void 0:n.ref.current;!function e(t){k.current=t,window.clearTimeout(R.current),""!==t&&(R.current=window.setTimeout(()=>e(""),1e3))}(r),l&&setTimeout(()=>l.focus())})(e.key));let i=L.current;if(e.target!==i||!B.includes(e.key))return;e.preventDefault();let o=A().filter(e=>!e.disabled).map(e=>e.ref.current);N.includes(e.key)&&o.reverse(),function(e){let t=document.activeElement;for(let n of e)if(n===t||(n.focus(),document.activeElement!==t))return}(o)}),onBlur:(0,i.mK)(e.onBlur,e=>{e.currentTarget.contains(e.target)||(window.clearTimeout(R.current),k.current="")}),onPointerMove:(0,i.mK)(e.onPointerMove,eY(e=>{let t=e.target,n=H.current!==e.clientX;e.currentTarget.contains(t)&&n&&(F.current=e.clientX>H.current?"right":"left",H.current=e.clientX)}))})})})})})})});ed.displayName=el;var em=r.forwardRef((e,t)=>{let{__scopeMenu:n,...r}=e;return(0,y.jsx)(l.sG.div,{role:"group",...r,ref:t})});em.displayName="MenuGroup";var eg=r.forwardRef((e,t)=>{let{__scopeMenu:n,...r}=e;return(0,y.jsx)(l.sG.div,{...r,ref:t})});eg.displayName="MenuLabel";var eb="MenuItem",ey="menu.itemSelect",ew=r.forwardRef((e,t)=>{let{disabled:n=!1,onSelect:a,...s}=e,c=r.useRef(null),u=et(eb,e.__scopeMenu),d=eu(eb,e.__scopeMenu),f=(0,o.s)(t,c),p=r.useRef(!1);return(0,y.jsx)(ex,{...s,ref:f,disabled:n,onClick:(0,i.mK)(e.onClick,()=>{let e=c.current;if(!n&&e){let t=new CustomEvent(ey,{bubbles:!0,cancelable:!0});e.addEventListener(ey,e=>null==a?void 0:a(e),{once:!0}),(0,l.hO)(e,t),t.defaultPrevented?p.current=!1:u.onClose()}}),onPointerDown:t=>{var n;null==(n=e.onPointerDown)||n.call(e,t),p.current=!0},onPointerUp:(0,i.mK)(e.onPointerUp,e=>{var t;p.current||null==(t=e.currentTarget)||t.click()}),onKeyDown:(0,i.mK)(e.onKeyDown,e=>{let t=""!==d.searchRef.current;n||t&&" "===e.key||F.includes(e.key)&&(e.currentTarget.click(),e.preventDefault())})})});ew.displayName=eb;var ex=r.forwardRef((e,t)=>{let{__scopeMenu:n,disabled:a=!1,textValue:s,...c}=e,u=eu(eb,n),d=Z(n),f=r.useRef(null),p=(0,o.s)(t,f),[h,v]=r.useState(!1),[m,g]=r.useState("");return r.useEffect(()=>{let e=f.current;if(e){var t;g((null!=(t=e.textContent)?t:"").trim())}},[c.children]),(0,y.jsx)(G.ItemSlot,{scope:n,disabled:a,textValue:null!=s?s:m,children:(0,y.jsx)(D,{asChild:!0,...d,focusable:!a,children:(0,y.jsx)(l.sG.div,{role:"menuitem","data-highlighted":h?"":void 0,"aria-disabled":a||void 0,"data-disabled":a?"":void 0,...c,ref:p,onPointerMove:(0,i.mK)(e.onPointerMove,eY(e=>{a?u.onItemLeave(e):(u.onItemEnter(e),e.defaultPrevented||e.currentTarget.focus({preventScroll:!0}))})),onPointerLeave:(0,i.mK)(e.onPointerLeave,eY(e=>u.onItemLeave(e))),onFocus:(0,i.mK)(e.onFocus,()=>v(!0)),onBlur:(0,i.mK)(e.onBlur,()=>v(!1))})})})}),eE=r.forwardRef((e,t)=>{let{checked:n=!1,onCheckedChange:r,...o}=e;return(0,y.jsx)(eP,{scope:e.__scopeMenu,checked:n,children:(0,y.jsx)(ew,{role:"menuitemcheckbox","aria-checked":eH(n)?"mixed":n,...o,ref:t,"data-state":eq(n),onSelect:(0,i.mK)(o.onSelect,()=>null==r?void 0:r(!!eH(n)||!n),{checkForDefaultPrevented:!1})})})});eE.displayName="MenuCheckboxItem";var e_="MenuRadioGroup",[eS,eM]=K(e_,{value:void 0,onValueChange:()=>{}}),eO=r.forwardRef((e,t)=>{let{value:n,onValueChange:r,...i}=e,o=(0,b.c)(r);return(0,y.jsx)(eS,{scope:e.__scopeMenu,value:n,onValueChange:o,children:(0,y.jsx)(em,{...i,ref:t})})});eO.displayName=e_;var ej="MenuRadioItem",eA=r.forwardRef((e,t)=>{let{value:n,...r}=e,o=eM(ej,e.__scopeMenu),a=n===o.value;return(0,y.jsx)(eP,{scope:e.__scopeMenu,checked:a,children:(0,y.jsx)(ew,{role:"menuitemradio","aria-checked":a,...r,ref:t,"data-state":eq(a),onSelect:(0,i.mK)(r.onSelect,()=>{var e;return null==(e=o.onValueChange)?void 0:e.call(o,n)},{checkForDefaultPrevented:!1})})})});eA.displayName=ej;var eC="MenuItemIndicator",[eP,eT]=K(eC,{checked:!1}),eL=r.forwardRef((e,t)=>{let{__scopeMenu:n,forceMount:r,...i}=e,o=eT(eC,n);return(0,y.jsx)(g.C,{present:r||eH(o.checked)||!0===o.checked,children:(0,y.jsx)(l.sG.span,{...i,ref:t,"data-state":eq(o.checked)})})});eL.displayName=eC;var eD=r.forwardRef((e,t)=>{let{__scopeMenu:n,...r}=e;return(0,y.jsx)(l.sG.div,{role:"separator","aria-orientation":"horizontal",...r,ref:t})});eD.displayName="MenuSeparator";var eR=r.forwardRef((e,t)=>{let{__scopeMenu:n,...r}=e,i=$(n);return(0,y.jsx)(v.i3,{...i,...r,ref:t})});eR.displayName="MenuArrow";var[ek,eI]=K("MenuSub"),ez="MenuSubTrigger",eU=r.forwardRef((e,t)=>{let n=J(ez,e.__scopeMenu),a=et(ez,e.__scopeMenu),s=eI(ez,e.__scopeMenu),l=eu(ez,e.__scopeMenu),c=r.useRef(null),{pointerGraceTimerRef:u,onPointerGraceIntentChange:d}=l,f={__scopeMenu:e.__scopeMenu},p=r.useCallback(()=>{c.current&&window.clearTimeout(c.current),c.current=null},[]);return r.useEffect(()=>p,[p]),r.useEffect(()=>{let e=u.current;return()=>{window.clearTimeout(e),d(null)}},[u,d]),(0,y.jsx)(er,{asChild:!0,...f,children:(0,y.jsx)(ex,{id:s.triggerId,"aria-haspopup":"menu","aria-expanded":n.open,"aria-controls":s.contentId,"data-state":eB(n.open),...e,ref:(0,o.t)(t,s.onTriggerChange),onClick:t=>{var r;null==(r=e.onClick)||r.call(e,t),e.disabled||t.defaultPrevented||(t.currentTarget.focus(),n.open||n.onOpenChange(!0))},onPointerMove:(0,i.mK)(e.onPointerMove,eY(t=>{l.onItemEnter(t),!t.defaultPrevented&&(e.disabled||n.open||c.current||(l.onPointerGraceIntentChange(null),c.current=window.setTimeout(()=>{n.onOpenChange(!0),p()},100)))})),onPointerLeave:(0,i.mK)(e.onPointerLeave,eY(e=>{var t,r;p();let i=null==(t=n.content)?void 0:t.getBoundingClientRect();if(i){let t=null==(r=n.content)?void 0:r.dataset.side,o="right"===t,a=i[o?"left":"right"],s=i[o?"right":"left"];l.onPointerGraceIntentChange({area:[{x:e.clientX+(o?-5:5),y:e.clientY},{x:a,y:i.top},{x:s,y:i.top},{x:s,y:i.bottom},{x:a,y:i.bottom}],side:t}),window.clearTimeout(u.current),u.current=window.setTimeout(()=>l.onPointerGraceIntentChange(null),300)}else{if(l.onTriggerLeave(e),e.defaultPrevented)return;l.onPointerGraceIntentChange(null)}})),onKeyDown:(0,i.mK)(e.onKeyDown,t=>{let r=""!==l.searchRef.current;if(!e.disabled&&(!r||" "!==t.key)&&H[a.dir].includes(t.key)){var i;n.onOpenChange(!0),null==(i=n.content)||i.focus(),t.preventDefault()}})})})});eU.displayName=ez;var eF="MenuSubContent",eN=r.forwardRef((e,t)=>{let n=ea(el,e.__scopeMenu),{forceMount:a=n.forceMount,...s}=e,l=J(el,e.__scopeMenu),c=et(el,e.__scopeMenu),u=eI(eF,e.__scopeMenu),d=r.useRef(null),f=(0,o.s)(t,d);return(0,y.jsx)(G.Provider,{scope:e.__scopeMenu,children:(0,y.jsx)(g.C,{present:a||l.open,children:(0,y.jsx)(G.Slot,{scope:e.__scopeMenu,children:(0,y.jsx)(ev,{id:u.contentId,"aria-labelledby":u.triggerId,...s,ref:f,align:"start",side:"rtl"===c.dir?"left":"right",disableOutsidePointerEvents:!1,disableOutsideScroll:!1,trapFocus:!1,onOpenAutoFocus:e=>{var t;c.isUsingKeyboardRef.current&&(null==(t=d.current)||t.focus()),e.preventDefault()},onCloseAutoFocus:e=>e.preventDefault(),onFocusOutside:(0,i.mK)(e.onFocusOutside,e=>{e.target!==u.trigger&&l.onOpenChange(!1)}),onEscapeKeyDown:(0,i.mK)(e.onEscapeKeyDown,e=>{c.onClose(),e.preventDefault()}),onKeyDown:(0,i.mK)(e.onKeyDown,e=>{let t=e.currentTarget.contains(e.target),n=q[c.dir].includes(e.key);if(t&&n){var r;l.onOpenChange(!1),null==(r=u.trigger)||r.focus(),e.preventDefault()}})})})})})});function eB(e){return e?"open":"closed"}function eH(e){return"indeterminate"===e}function eq(e){return eH(e)?"indeterminate":e?"checked":"unchecked"}function eY(e){return t=>"mouse"===t.pointerType?e(t):void 0}eN.displayName=eF;var eG="DropdownMenu",[eW,eX]=(0,a.A)(eG,[V]),eK=V(),[eV,e$]=eW(eG),eZ=e=>{let{__scopeDropdownMenu:t,children:n,dir:i,open:o,defaultOpen:a,onOpenChange:l,modal:c=!0}=e,u=eK(t),d=r.useRef(null),[f,p]=(0,s.i)({prop:o,defaultProp:null!=a&&a,onChange:l,caller:eG});return(0,y.jsx)(eV,{scope:t,triggerId:(0,h.B)(),triggerRef:d,contentId:(0,h.B)(),open:f,onOpenChange:p,onOpenToggle:r.useCallback(()=>p(e=>!e),[p]),modal:c,children:(0,y.jsx)(en,{...u,open:f,onOpenChange:p,dir:i,modal:c,children:n})})};eZ.displayName=eG;var eQ="DropdownMenuTrigger",eJ=r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,disabled:r=!1,...a}=e,s=e$(eQ,n),c=eK(n);return(0,y.jsx)(er,{asChild:!0,...c,children:(0,y.jsx)(l.sG.button,{type:"button",id:s.triggerId,"aria-haspopup":"menu","aria-expanded":s.open,"aria-controls":s.open?s.contentId:void 0,"data-state":s.open?"open":"closed","data-disabled":r?"":void 0,disabled:r,...a,ref:(0,o.t)(t,s.triggerRef),onPointerDown:(0,i.mK)(e.onPointerDown,e=>{!r&&0===e.button&&!1===e.ctrlKey&&(s.onOpenToggle(),s.open||e.preventDefault())}),onKeyDown:(0,i.mK)(e.onKeyDown,e=>{!r&&(["Enter"," "].includes(e.key)&&s.onOpenToggle(),"ArrowDown"===e.key&&s.onOpenChange(!0),["Enter"," ","ArrowDown"].includes(e.key)&&e.preventDefault())})})})});eJ.displayName=eQ;var e0=e=>{let{__scopeDropdownMenu:t,...n}=e,r=eK(t);return(0,y.jsx)(es,{...r,...n})};e0.displayName="DropdownMenuPortal";var e1="DropdownMenuContent",e2=r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,...o}=e,a=e$(e1,n),s=eK(n),l=r.useRef(!1);return(0,y.jsx)(ed,{id:a.contentId,"aria-labelledby":a.triggerId,...s,...o,ref:t,onCloseAutoFocus:(0,i.mK)(e.onCloseAutoFocus,e=>{var t;l.current||null==(t=a.triggerRef.current)||t.focus(),l.current=!1,e.preventDefault()}),onInteractOutside:(0,i.mK)(e.onInteractOutside,e=>{let t=e.detail.originalEvent,n=0===t.button&&!0===t.ctrlKey,r=2===t.button||n;(!a.modal||r)&&(l.current=!0)}),style:{...e.style,"--radix-dropdown-menu-content-transform-origin":"var(--radix-popper-transform-origin)","--radix-dropdown-menu-content-available-width":"var(--radix-popper-available-width)","--radix-dropdown-menu-content-available-height":"var(--radix-popper-available-height)","--radix-dropdown-menu-trigger-width":"var(--radix-popper-anchor-width)","--radix-dropdown-menu-trigger-height":"var(--radix-popper-anchor-height)"}})});e2.displayName=e1;var e3=r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,...r}=e,i=eK(n);return(0,y.jsx)(em,{...i,...r,ref:t})});e3.displayName="DropdownMenuGroup",r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,...r}=e,i=eK(n);return(0,y.jsx)(eg,{...i,...r,ref:t})}).displayName="DropdownMenuLabel";var e4=r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,...r}=e,i=eK(n);return(0,y.jsx)(ew,{...i,...r,ref:t})});e4.displayName="DropdownMenuItem",r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,...r}=e,i=eK(n);return(0,y.jsx)(eE,{...i,...r,ref:t})}).displayName="DropdownMenuCheckboxItem",r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,...r}=e,i=eK(n);return(0,y.jsx)(eO,{...i,...r,ref:t})}).displayName="DropdownMenuRadioGroup",r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,...r}=e,i=eK(n);return(0,y.jsx)(eA,{...i,...r,ref:t})}).displayName="DropdownMenuRadioItem",r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,...r}=e,i=eK(n);return(0,y.jsx)(eL,{...i,...r,ref:t})}).displayName="DropdownMenuItemIndicator";var e5=r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,...r}=e,i=eK(n);return(0,y.jsx)(eD,{...i,...r,ref:t})});e5.displayName="DropdownMenuSeparator",r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,...r}=e,i=eK(n);return(0,y.jsx)(eR,{...i,...r,ref:t})}).displayName="DropdownMenuArrow",r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,...r}=e,i=eK(n);return(0,y.jsx)(eU,{...i,...r,ref:t})}).displayName="DropdownMenuSubTrigger",r.forwardRef((e,t)=>{let{__scopeDropdownMenu:n,...r}=e,i=eK(n);return(0,y.jsx)(eN,{...i,...r,ref:t,style:{...e.style,"--radix-dropdown-menu-content-transform-origin":"var(--radix-popper-transform-origin)","--radix-dropdown-menu-content-available-width":"var(--radix-popper-available-width)","--radix-dropdown-menu-content-available-height":"var(--radix-popper-available-height)","--radix-dropdown-menu-trigger-width":"var(--radix-popper-anchor-width)","--radix-dropdown-menu-trigger-height":"var(--radix-popper-anchor-height)"}})}).displayName="DropdownMenuSubContent";var e6=eZ,e7=eJ,e9=e0,e8=e2,te=e3,tt=e4,tn=e5},638:(e,t,n)=>{n.d(t,{Cc:()=>r});function r(e,t,n){return(1-n)*e+n*t}},1114:(e,t,n)=>{n.d(t,{Do:()=>o,Fh:()=>p});var r=n(7964),i=n(2331);let o=/\bvoid\s+main\s*\(\s*\)\s*{/g;function a(e){return e.replace(/^[ \t]*#include +<([\w\d./]+)>/gm,function(e,t){let n=r.ShaderChunk[t];return n?a(n):e})}let s=[];for(let e=0;e<256;e++)s[e]=(e<16?"0":"")+e.toString(16);let l=Object.assign||function(){let e=arguments[0];for(let t=1,n=arguments.length;t<n;t++){let n=arguments[t];if(n)for(let t in n)Object.prototype.hasOwnProperty.call(n,t)&&(e[t]=n[t])}return e},c=Date.now(),u=new WeakMap,d=new Map,f=1e10;function p(e,t){let n=function(e){let t=JSON.stringify(e,v),n=g.get(t);return null==n&&g.set(t,n=++m),n}(t),r=u.get(e);if(r||u.set(e,r=Object.create(null)),r[n])return new r[n];let o=`_onBeforeCompile${n}`,b=function(r,i){e.onBeforeCompile.call(this,r,i);let s=this.customProgramCacheKey()+"|"+r.vertexShader+"|"+r.fragmentShader,u=d[s];if(!u){let e=function(e,{vertexShader:t,fragmentShader:n},r,i){let{vertexDefs:o,vertexMainIntro:s,vertexMainOutro:l,vertexTransform:c,fragmentDefs:u,fragmentMainIntro:d,fragmentMainOutro:f,fragmentColorTransform:p,customRewriter:v,timeUniform:m}=r;if(o=o||"",s=s||"",l=l||"",u=u||"",d=d||"",f=f||"",(c||v)&&(t=a(t)),(p||v)&&(n=a(n=n.replace(/^[ \t]*#include <((?:tonemapping|encodings|colorspace|fog|premultiplied_alpha|dithering)_fragment)>/gm,"\n//!BEGIN_POST_CHUNK $1\n$&\n//!END_POST_CHUNK\n"))),v){let e=v({vertexShader:t,fragmentShader:n});t=e.vertexShader,n=e.fragmentShader}if(p){let e=[];n=n.replace(/^\/\/!BEGIN_POST_CHUNK[^]+?^\/\/!END_POST_CHUNK/gm,t=>(e.push(t),"")),f=`${p}
${e.join("\n")}
${f}`}if(m){let e=`
uniform float ${m};
`;o=e+o,u=e+u}return c&&(t=`vec3 troika_position_${i};
vec3 troika_normal_${i};
vec2 troika_uv_${i};
${t}
`,o=`${o}
void troikaVertexTransform${i}(inout vec3 position, inout vec3 normal, inout vec2 uv) {
  ${c}
}
`,s=`
troika_position_${i} = vec3(position);
troika_normal_${i} = vec3(normal);
troika_uv_${i} = vec2(uv);
troikaVertexTransform${i}(troika_position_${i}, troika_normal_${i}, troika_uv_${i});
${s}
`,t=t.replace(/\b(position|normal|uv)\b/g,(e,t,n,r)=>/\battribute\s+vec[23]\s+$/.test(r.substr(0,n))?t:`troika_${t}_${i}`),e.map&&e.map.channel>0||(t=t.replace(/\bMAP_UV\b/g,`troika_uv_${i}`))),{vertexShader:t=h(t,i,o,s,l),fragmentShader:n=h(n,i,u,d,f)}}(this,r,t,n);u=d[s]=e}r.vertexShader=u.vertexShader,r.fragmentShader=u.fragmentShader,l(r.uniforms,this.uniforms),t.timeUniform&&(r.uniforms[t.timeUniform]={get value(){return Date.now()-c}}),this[o]&&this[o](r)},y=function(){return w(t.chained?e:e.clone())},w=function(r){let i=Object.create(r,x);return Object.defineProperty(i,"baseMaterial",{value:e}),Object.defineProperty(i,"id",{value:f++}),i.uuid=function(){let e=0xffffffff*Math.random()|0,t=0xffffffff*Math.random()|0,n=0xffffffff*Math.random()|0,r=0xffffffff*Math.random()|0;return(s[255&e]+s[e>>8&255]+s[e>>16&255]+s[e>>24&255]+"-"+s[255&t]+s[t>>8&255]+"-"+s[t>>16&15|64]+s[t>>24&255]+"-"+s[63&n|128]+s[n>>8&255]+"-"+s[n>>16&255]+s[n>>24&255]+s[255&r]+s[r>>8&255]+s[r>>16&255]+s[r>>24&255]).toUpperCase()}(),i.uniforms=l({},r.uniforms,t.uniforms),i.defines=l({},r.defines,t.defines),i.defines[`TROIKA_DERIVED_MATERIAL_${n}`]="",i.extensions=l({},r.extensions,t.extensions),i._listeners=void 0,i},x={constructor:{value:y},isDerivedMaterial:{value:!0},type:{get:()=>e.type,set:t=>{e.type=t}},isDerivedFrom:{writable:!0,configurable:!0,value:function(e){let t=this.baseMaterial;return e===t||t.isDerivedMaterial&&t.isDerivedFrom(e)||!1}},customProgramCacheKey:{writable:!0,configurable:!0,value:function(){return e.customProgramCacheKey()+"|"+n}},onBeforeCompile:{get:()=>b,set(e){this[o]=e}},copy:{writable:!0,configurable:!0,value:function(t){return e.copy.call(this,t),e.isShaderMaterial||e.isDerivedMaterial||(l(this.extensions,t.extensions),l(this.defines,t.defines),l(this.uniforms,i.LlO.clone(t.uniforms))),this}},clone:{writable:!0,configurable:!0,value:function(){return w(new e.constructor).copy(this)}},getDepthMaterial:{writable:!0,configurable:!0,value:function(){let n=this._depthMaterial;return n||((n=this._depthMaterial=p(e.isDerivedMaterial?e.getDepthMaterial():new i.CSG({depthPacking:i.N5j}),t)).defines.IS_DEPTH_MATERIAL="",n.uniforms=this.uniforms),n}},getDistanceMaterial:{writable:!0,configurable:!0,value:function(){let n=this._distanceMaterial;return n||((n=this._distanceMaterial=p(e.isDerivedMaterial?e.getDistanceMaterial():new i.aVO,t)).defines.IS_DISTANCE_MATERIAL="",n.uniforms=this.uniforms),n}},dispose:{writable:!0,configurable:!0,value(){let{_depthMaterial:t,_distanceMaterial:n}=this;t&&t.dispose(),n&&n.dispose(),e.dispose.call(this)}}};return r[n]=y,new y}function h(e,t,n,r,i){return(r||i||n)&&(e=e.replace(o,`
${n}
void troikaOrigMain${t}() {`)+`
void main() {
  ${r}
  troikaOrigMain${t}();
  ${i}
}`),e}function v(e,t){return"uniforms"===e?void 0:"function"==typeof t?t.toString():t}let m=0,g=new Map,b=`
uniform vec3 pointA;
uniform vec3 controlA;
uniform vec3 controlB;
uniform vec3 pointB;
uniform float radius;
varying float bezierT;

vec3 cubicBezier(vec3 p1, vec3 c1, vec3 c2, vec3 p2, float t) {
  float t2 = 1.0 - t;
  float b0 = t2 * t2 * t2;
  float b1 = 3.0 * t * t2 * t2;
  float b2 = 3.0 * t * t * t2;
  float b3 = t * t * t;
  return b0 * p1 + b1 * c1 + b2 * c2 + b3 * p2;
}

vec3 cubicBezierDerivative(vec3 p1, vec3 c1, vec3 c2, vec3 p2, float t) {
  float t2 = 1.0 - t;
  return -3.0 * p1 * t2 * t2 +
    c1 * (3.0 * t2 * t2 - 6.0 * t2 * t) +
    c2 * (6.0 * t2 * t - 3.0 * t * t) +
    3.0 * p2 * t * t;
}
`,y=`
float t = position.y;
bezierT = t;
vec3 bezierCenterPos = cubicBezier(pointA, controlA, controlB, pointB, t);
vec3 bezierDir = normalize(cubicBezierDerivative(pointA, controlA, controlB, pointB, t));

// Make "sideways" always perpendicular to the camera ray; this ensures that any twists
// in the cylinder occur where you won't see them: 
vec3 viewDirection = normalMatrix * vec3(0.0, 0.0, 1.0);
if (bezierDir == viewDirection) {
  bezierDir = normalize(cubicBezierDerivative(pointA, controlA, controlB, pointB, t == 1.0 ? t - 0.0001 : t + 0.0001));
}
vec3 sideways = normalize(cross(bezierDir, viewDirection));
vec3 upish = normalize(cross(sideways, bezierDir));

// Build a matrix for transforming this disc in the cylinder:
mat4 discTx;
discTx[0].xyz = sideways * radius;
discTx[1].xyz = bezierDir * radius;
discTx[2].xyz = upish * radius;
discTx[3].xyz = bezierCenterPos;
discTx[3][3] = 1.0;

// Apply transform, ignoring original y
position = (discTx * vec4(position.x, 0.0, position.z, 1.0)).xyz;
normal = normalize(mat3(discTx) * normal);
`,w=`
uniform vec3 dashing;
varying float bezierT;
`,x=`
if (dashing.x + dashing.y > 0.0) {
  float dashFrac = mod(bezierT - dashing.z, dashing.x + dashing.y);
  if (dashFrac > dashing.x) {
    discard;
  }
}
`,E=null,_=new i._4j({color:0xffffff,side:i.$EB});class S extends i.eaF{static getGeometry(){return E||(E=new i.Ho_(1,1,1,6,64).translate(0,.5,0))}constructor(){super(S.getGeometry(),_),this.pointA=new i.Pq0,this.controlA=new i.Pq0,this.controlB=new i.Pq0,this.pointB=new i.Pq0,this.radius=.01,this.dashArray=new i.I9Y,this.dashOffset=0,this.frustumCulled=!1}get material(){let e=this._derivedMaterial,t=this._baseMaterial||this._defaultMaterial||(this._defaultMaterial=_.clone());return e&&e.baseMaterial===t||(e=this._derivedMaterial=p(t,{chained:!0,uniforms:{pointA:{value:new i.Pq0},controlA:{value:new i.Pq0},controlB:{value:new i.Pq0},pointB:{value:new i.Pq0},radius:{value:.01},dashing:{value:new i.Pq0}},vertexDefs:b,vertexTransform:y,fragmentDefs:w,fragmentMainIntro:x}),t.addEventListener("dispose",function n(){t.removeEventListener("dispose",n),e.dispose()})),e}set material(e){this._baseMaterial=e}get customDepthMaterial(){return this.material.getDepthMaterial()}set customDepthMaterial(e){}get customDistanceMaterial(){return this.material.getDistanceMaterial()}set customDistanceMaterial(e){}onBeforeRender(){let{uniforms:e}=this.material,{pointA:t,controlA:n,controlB:r,pointB:i,radius:o,dashArray:a,dashOffset:s}=this;e.pointA.value.copy(t),e.controlA.value.copy(n),e.controlB.value.copy(r),e.pointB.value.copy(i),e.radius.value=o,e.dashing.value.set(a.x,a.y,s||0)}raycast(){}}},2070:(e,t,n)=>{e.exports=n(7117)},2396:(e,t,n)=>{n.d(t,{A:()=>r});function r(){return(r=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)({}).hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e}).apply(null,arguments)}},2669:(e,t,n)=>{n.d(t,{A:()=>r});function r(){return function(e){function t(e,t){for(var n,r,i,o,a,s=/([MLQCZ])([^MLQCZ]*)/g;n=s.exec(e);){var l=n[2].replace(/^\s*|\s*$/g,"").split(/[,\s]+/).map(function(e){return parseFloat(e)});switch(n[1]){case"M":o=r=l[0],a=i=l[1];break;case"L":(l[0]!==o||l[1]!==a)&&t("L",o,a,o=l[0],a=l[1]);break;case"Q":t("Q",o,a,o=l[2],a=l[3],l[0],l[1]);break;case"C":t("C",o,a,o=l[4],a=l[5],l[0],l[1],l[2],l[3]);break;case"Z":(o!==r||a!==i)&&t("L",o,a,r,i)}}}function n(e,n,r){void 0===r&&(r=16);var i={x:0,y:0};t(e,function(e,t,o,a,s,l,c,u,d){switch(e){case"L":n(t,o,a,s);break;case"Q":for(var f=t,p=o,h=1;h<r;h++)!function(e,t,n,r,i,o,a,s){var l=1-a;s.x=l*l*e+2*l*a*n+a*a*i,s.y=l*l*t+2*l*a*r+a*a*o}(t,o,l,c,a,s,h/(r-1),i),n(f,p,i.x,i.y),f=i.x,p=i.y;break;case"C":for(var v=t,m=o,g=1;g<r;g++)!function(e,t,n,r,i,o,a,s,l,c){var u=1-l;c.x=u*u*u*e+3*u*u*l*n+3*u*l*l*i+l*l*l*a,c.y=u*u*u*t+3*u*u*l*r+3*u*l*l*o+l*l*l*s}(t,o,l,c,u,d,a,s,g/(r-1),i),n(v,m,i.x,i.y),v=i.x,m=i.y}})}var r="precision highp float;attribute vec2 aUV;varying vec2 vUV;void main(){vUV=aUV;gl_Position=vec4(mix(vec2(-1.0),vec2(1.0),aUV),0.0,1.0);}",i=new WeakMap,o={premultipliedAlpha:!1,preserveDrawingBuffer:!0,antialias:!1,depth:!1};function a(e,t){var n=e.getContext?e.getContext("webgl",o):e,r=i.get(n);if(!r){var a="undefined"!=typeof WebGL2RenderingContext&&n instanceof WebGL2RenderingContext,s={},l={},c={},u=-1,d=[];function f(e){var t=s[e];if(!t&&!(t=s[e]=n.getExtension(e)))throw Error(e+" not supported");return t}function p(e,t){var r=n.createShader(t);return n.shaderSource(r,e),n.compileShader(r),r}function h(){s={},l={},c={},u=-1,d.length=0}n.canvas.addEventListener("webglcontextlost",function(e){h(),e.preventDefault()},!1),i.set(n,r={gl:n,isWebGL2:a,getExtension:f,withProgram:function(e,t,r,i){if(!l[e]){var o={},s={},c=n.createProgram();n.attachShader(c,p(t,n.VERTEX_SHADER)),n.attachShader(c,p(r,n.FRAGMENT_SHADER)),n.linkProgram(c),l[e]={program:c,transaction:function(e){n.useProgram(c),e({setUniform:function(e,t){for(var r=[],i=arguments.length-2;i-- >0;)r[i]=arguments[i+2];var o=s[t]||(s[t]=n.getUniformLocation(c,t));n["uniform"+e].apply(n,[o].concat(r))},setAttribute:function(e,t,r,i,s){var l=o[e];l||(l=o[e]={buf:n.createBuffer(),loc:n.getAttribLocation(c,e),data:null}),n.bindBuffer(n.ARRAY_BUFFER,l.buf),n.vertexAttribPointer(l.loc,t,n.FLOAT,!1,0,0),n.enableVertexAttribArray(l.loc),a?n.vertexAttribDivisor(l.loc,i):f("ANGLE_instanced_arrays").vertexAttribDivisorANGLE(l.loc,i),s!==l.data&&(n.bufferData(n.ARRAY_BUFFER,s,r),l.data=s)}})}}}l[e].transaction(i)},withTexture:function(e,t){u++;try{n.activeTexture(n.TEXTURE0+u);var r=c[e];r||(r=c[e]=n.createTexture(),n.bindTexture(n.TEXTURE_2D,r),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST)),n.bindTexture(n.TEXTURE_2D,r),t(r,u)}finally{u--}},withTextureFramebuffer:function(e,t,r){var i=n.createFramebuffer();d.push(i),n.bindFramebuffer(n.FRAMEBUFFER,i),n.activeTexture(n.TEXTURE0+t),n.bindTexture(n.TEXTURE_2D,e),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,e,0);try{r(i)}finally{n.deleteFramebuffer(i),n.bindFramebuffer(n.FRAMEBUFFER,d[--d.length-1]||null)}},handleContextLoss:h})}t(r)}function s(e,t,n,i,o,s,l,c){void 0===l&&(l=15),void 0===c&&(c=null),a(e,function(e){var a=e.gl,u=e.withProgram;(0,e.withTexture)("copy",function(e,d){a.texImage2D(a.TEXTURE_2D,0,a.RGBA,o,s,0,a.RGBA,a.UNSIGNED_BYTE,t),u("copy",r,"precision highp float;uniform sampler2D tex;varying vec2 vUV;void main(){gl_FragColor=texture2D(tex,vUV);}",function(e){var t=e.setUniform;(0,e.setAttribute)("aUV",2,a.STATIC_DRAW,0,new Float32Array([0,0,2,0,0,2])),t("1i","image",d),a.bindFramebuffer(a.FRAMEBUFFER,c||null),a.disable(a.BLEND),a.colorMask(8&l,4&l,2&l,1&l),a.viewport(n,i,o,s),a.scissor(n,i,o,s),a.drawArrays(a.TRIANGLES,0,3)})})})}var l=Object.freeze({__proto__:null,withWebGLContext:a,renderImageData:s,resizeWebGLCanvasWithoutClearing:function(e,t,n){var r=e.width,i=e.height;a(e,function(o){var a=o.gl,l=new Uint8Array(r*i*4);a.readPixels(0,0,r,i,a.RGBA,a.UNSIGNED_BYTE,l),e.width=t,e.height=n,s(a,l,0,0,r,i)})}});function c(e,t,r,i,o,a){void 0===a&&(a=1);var s=new Uint8Array(e*t),l=i[2]-i[0],c=i[3]-i[1],u=[];n(r,function(e,t,n,r){u.push({x1:e,y1:t,x2:n,y2:r,minX:Math.min(e,n),minY:Math.min(t,r),maxX:Math.max(e,n),maxY:Math.max(t,r)})}),u.sort(function(e,t){return e.maxX-t.maxX});for(var d=0;d<e;d++)for(var f=0;f<t;f++){var p=function(e,t){for(var n=1/0,r=1/0,i=u.length;i--;){var o=u[i];if(o.maxX+r<=e)break;if(e+r>o.minX&&t-r<o.maxY&&t+r>o.minY){var a=function(e,t,n,r,i,o){var a=i-n,s=o-r,l=a*a+s*s,c=l?Math.max(0,Math.min(1,((e-n)*a+(t-r)*s)/l)):0,u=e-(n+c*a),d=t-(r+c*s);return u*u+d*d}(e,t,o.x1,o.y1,o.x2,o.y2);a<n&&(r=Math.sqrt(n=a))}}return function(e,t){for(var n=0,r=u.length;r--;){var i=u[r];if(i.maxX<=e)break;i.y1>t!=i.y2>t&&e<(i.x2-i.x1)*(t-i.y1)/(i.y2-i.y1)+i.x1&&(n+=i.y1<i.y2?1:-1)}return 0!==n}(e,t)&&(r=-r),r}(i[0]+l*(d+.5)/e,i[1]+c*(f+.5)/t),h=Math.pow(1-Math.abs(p)/o,a)/2;p<0&&(h=1-h),h=Math.max(0,Math.min(255,Math.round(255*h))),s[f*e+d]=h}return s}function u(e,t,n,r,i,o,a,s,l,c){void 0===o&&(o=1),void 0===s&&(s=0),void 0===l&&(l=0),void 0===c&&(c=0),d(e,t,n,r,i,o,a,null,s,l,c)}function d(e,t,n,r,i,o,a,l,u,d,f){void 0===o&&(o=1),void 0===u&&(u=0),void 0===d&&(d=0),void 0===f&&(f=0);for(var p=c(e,t,n,r,i,o),h=new Uint8Array(4*p.length),v=0;v<p.length;v++)h[4*v+f]=p[v];s(a,h,u,d,e,t,1<<3-f,l)}var f=Object.freeze({__proto__:null,generate:c,generateIntoCanvas:u,generateIntoFramebuffer:d}),p=new Float32Array([0,0,2,0,0,2]),h=null,v=!1,m={},g=new WeakMap;function b(e){if(!v&&!E(e))throw Error("WebGL generation not supported")}function y(e,t,n,r,i,o,s){if(void 0===o&&(o=1),void 0===s&&(s=null),!s&&!(s=h)){var l="function"==typeof OffscreenCanvas?new OffscreenCanvas(1,1):"undefined"!=typeof document?document.createElement("canvas"):null;if(!l)throw Error("OffscreenCanvas or DOM canvas not supported");s=h=l.getContext("webgl",{depth:!1})}b(s);var c=new Uint8Array(e*t*4);a(s,function(a){var s=a.gl,l=a.withTexture,u=a.withTextureFramebuffer;l("readable",function(a,l){s.texImage2D(s.TEXTURE_2D,0,s.RGBA,e,t,0,s.RGBA,s.UNSIGNED_BYTE,null),u(a,l,function(a){x(e,t,n,r,i,o,s,a,0,0,0),s.readPixels(0,0,e,t,s.RGBA,s.UNSIGNED_BYTE,c)})})});for(var u=new Uint8Array(e*t),d=0,f=0;d<c.length;d+=4)u[f++]=c[d];return u}function w(e,t,n,r,i,o,a,s,l,c){void 0===o&&(o=1),void 0===s&&(s=0),void 0===l&&(l=0),void 0===c&&(c=0),x(e,t,n,r,i,o,a,null,s,l,c)}function x(e,t,i,o,s,l,c,u,d,f,h){void 0===l&&(l=1),void 0===d&&(d=0),void 0===f&&(f=0),void 0===h&&(h=0),b(c);var v=[];n(i,function(e,t,n,r){v.push(e,t,n,r)}),v=new Float32Array(v),a(c,function(n){var i=n.gl,a=n.isWebGL2,c=n.getExtension,m=n.withProgram,g=n.withTexture,b=n.withTextureFramebuffer,y=n.handleContextLoss;if(g("rawDistances",function(n,g){(e!==n._lastWidth||t!==n._lastHeight)&&i.texImage2D(i.TEXTURE_2D,0,i.RGBA,n._lastWidth=e,n._lastHeight=t,0,i.RGBA,i.UNSIGNED_BYTE,null),m("main","precision highp float;uniform vec4 uGlyphBounds;attribute vec2 aUV;attribute vec4 aLineSegment;varying vec4 vLineSegment;varying vec2 vGlyphXY;void main(){vLineSegment=aLineSegment;vGlyphXY=mix(uGlyphBounds.xy,uGlyphBounds.zw,aUV);gl_Position=vec4(mix(vec2(-1.0),vec2(1.0),aUV),0.0,1.0);}","precision highp float;uniform vec4 uGlyphBounds;uniform float uMaxDistance;uniform float uExponent;varying vec4 vLineSegment;varying vec2 vGlyphXY;float absDistToSegment(vec2 point,vec2 lineA,vec2 lineB){vec2 lineDir=lineB-lineA;float lenSq=dot(lineDir,lineDir);float t=lenSq==0.0 ? 0.0 : clamp(dot(point-lineA,lineDir)/lenSq,0.0,1.0);vec2 linePt=lineA+t*lineDir;return distance(point,linePt);}void main(){vec4 seg=vLineSegment;vec2 p=vGlyphXY;float dist=absDistToSegment(p,seg.xy,seg.zw);float val=pow(1.0-clamp(dist/uMaxDistance,0.0,1.0),uExponent)*0.5;bool crossing=(seg.y>p.y!=seg.w>p.y)&&(p.x<(seg.z-seg.x)*(p.y-seg.y)/(seg.w-seg.y)+seg.x);bool crossingUp=crossing&&vLineSegment.y<vLineSegment.w;gl_FragColor=vec4(crossingUp ? 1.0/255.0 : 0.0,crossing&&!crossingUp ? 1.0/255.0 : 0.0,0.0,val);}",function(r){var u=r.setAttribute,d=r.setUniform,f=!a&&c("ANGLE_instanced_arrays"),h=!a&&c("EXT_blend_minmax");u("aUV",2,i.STATIC_DRAW,0,p),u("aLineSegment",4,i.DYNAMIC_DRAW,1,v),d.apply(void 0,["4f","uGlyphBounds"].concat(o)),d("1f","uMaxDistance",s),d("1f","uExponent",l),b(n,g,function(n){i.enable(i.BLEND),i.colorMask(!0,!0,!0,!0),i.viewport(0,0,e,t),i.scissor(0,0,e,t),i.blendFunc(i.ONE,i.ONE),i.blendEquationSeparate(i.FUNC_ADD,a?i.MAX:h.MAX_EXT),i.clear(i.COLOR_BUFFER_BIT),a?i.drawArraysInstanced(i.TRIANGLES,0,3,v.length/4):f.drawArraysInstancedANGLE(i.TRIANGLES,0,3,v.length/4)})}),m("post",r,"precision highp float;uniform sampler2D tex;varying vec2 vUV;void main(){vec4 color=texture2D(tex,vUV);bool inside=color.r!=color.g;float val=inside ? 1.0-color.a : color.a;gl_FragColor=vec4(val);}",function(n){n.setAttribute("aUV",2,i.STATIC_DRAW,0,p),n.setUniform("1i","tex",g),i.bindFramebuffer(i.FRAMEBUFFER,u),i.disable(i.BLEND),i.colorMask(0===h,1===h,2===h,3===h),i.viewport(d,f,e,t),i.scissor(d,f,e,t),i.drawArrays(i.TRIANGLES,0,3)})}),i.isContextLost())throw y(),Error("webgl context lost")})}function E(e){var t=e&&e!==h?e.canvas||e:m,n=g.get(t);if(void 0===n){v=!0;var r=null;try{var i=[97,106,97,61,99,137,118,80,80,118,137,99,61,97,106,97],o=y(4,4,"M8,8L16,8L24,24L16,24Z",[0,0,32,32],24,1,e);(n=o&&i.length===o.length&&o.every(function(e,t){return e===i[t]}))||(r="bad trial run results",console.info(i,o))}catch(e){n=!1,r=e.message}r&&console.warn("WebGL SDF generation not supported:",r),v=!1,g.set(t,n)}return n}var _=Object.freeze({__proto__:null,generate:y,generateIntoCanvas:w,generateIntoFramebuffer:x,isSupported:E});return e.forEachPathCommand=t,e.generate=function(e,t,n,r,i,o){void 0===i&&(i=Math.max(r[2]-r[0],r[3]-r[1])/2),void 0===o&&(o=1);try{return y.apply(_,arguments)}catch(e){return console.info("WebGL SDF generation failed, falling back to JS",e),c.apply(f,arguments)}},e.generateIntoCanvas=function(e,t,n,r,i,o,a,s,l,c){void 0===i&&(i=Math.max(r[2]-r[0],r[3]-r[1])/2),void 0===o&&(o=1),void 0===s&&(s=0),void 0===l&&(l=0),void 0===c&&(c=0);try{return w.apply(_,arguments)}catch(e){return console.info("WebGL SDF generation failed, falling back to JS",e),u.apply(f,arguments)}},e.javascript=f,e.pathToLineSegments=n,e.webgl=_,e.webglUtils=l,Object.defineProperty(e,"__esModule",{value:!0}),e}({})}},2834:(e,t,n)=>{n.d(t,{E:()=>l});var r=n(2396),i=n(4364),o=n(7806),a=n(3353),s=n(6935);let l=i.forwardRef(({sdfGlyphSize:e=64,anchorX:t="center",anchorY:n="middle",font:l,fontSize:c=1,children:u,characters:d,onSync:f,...p},h)=>{let v=(0,a.C)(({invalidate:e})=>e),[m]=i.useState(()=>new o.EY),[g,b]=i.useMemo(()=>{let e=[],t="";return i.Children.forEach(u,n=>{"string"==typeof n||"number"==typeof n?t+=n:e.push(n)}),[e,t]},[u]);return(0,s.DY)(()=>new Promise(e=>(0,o.PY)({font:l,characters:d},e)),["troika-text",l,d]),i.useLayoutEffect(()=>void m.sync(()=>{v(),f&&f(m)})),i.useEffect(()=>()=>m.dispose(),[m]),i.createElement("primitive",(0,r.A)({object:m,ref:h,font:l,text:b,anchorX:t,anchorY:n,fontSize:c,sdfGlyphSize:e},p),g)})},3140:(e,t,n)=>{n.d(t,{Ay:()=>ew});var r,i,o,a,s,l,c,u=n(149),d={},f=180/Math.PI,p=Math.PI/180,h=Math.atan2,v=/([A-Z])/g,m=/(left|right|width|margin|padding|x)/i,g=/[\s,\(]\S/,b={autoAlpha:"opacity,visibility",scale:"scaleX,scaleY",alpha:"opacity"},y=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},w=function(e,t){return t.set(t.t,t.p,1===e?t.e:Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},x=function(e,t){return t.set(t.t,t.p,e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},E=function(e,t){var n=t.s+t.c*e;t.set(t.t,t.p,~~(n+(n<0?-.5:.5))+t.u,t)},_=function(e,t){return t.set(t.t,t.p,e?t.e:t.b,t)},S=function(e,t){return t.set(t.t,t.p,1!==e?t.b:t.e,t)},M=function(e,t,n){return e.style[t]=n},O=function(e,t,n){return e.style.setProperty(t,n)},j=function(e,t,n){return e._gsap[t]=n},A=function(e,t,n){return e._gsap.scaleX=e._gsap.scaleY=n},C=function(e,t,n,r,i){var o=e._gsap;o.scaleX=o.scaleY=n,o.renderTransform(i,o)},P=function(e,t,n,r,i){var o=e._gsap;o[t]=n,o.renderTransform(i,o)},T="transform",L=T+"Origin",D=function e(t,n){var r=this,i=this.target,o=i.style,a=i._gsap;if(t in d&&o){if(this.tfm=this.tfm||{},"transform"===t)return b.transform.split(",").forEach(function(t){return e.call(r,t,n)});if(~(t=b[t]||t).indexOf(",")?t.split(",").forEach(function(e){return r.tfm[e]=Z(i,e)}):this.tfm[t]=a.x?a[t]:Z(i,t),t===L&&(this.tfm.zOrigin=a.zOrigin),this.props.indexOf(T)>=0)return;a.svg&&(this.svgo=i.getAttribute("data-svg-origin"),this.props.push(L,n,"")),t=T}(o||n)&&this.props.push(t,n,o[t])},R=function(e){e.translate&&(e.removeProperty("translate"),e.removeProperty("scale"),e.removeProperty("rotate"))},k=function(){var e,t,n=this.props,r=this.target,i=r.style,o=r._gsap;for(e=0;e<n.length;e+=3)n[e+1]?2===n[e+1]?r[n[e]](n[e+2]):r[n[e]]=n[e+2]:n[e+2]?i[n[e]]=n[e+2]:i.removeProperty("--"===n[e].substr(0,2)?n[e]:n[e].replace(v,"-$1").toLowerCase());if(this.tfm){for(t in this.tfm)o[t]=this.tfm[t];o.svg&&(o.renderTransform(),r.setAttribute("data-svg-origin",this.svgo||"")),(e=l())&&e.isStart||i[T]||(R(i),o.zOrigin&&i[L]&&(i[L]+=" "+o.zOrigin+"px",o.zOrigin=0,o.renderTransform()),o.uncache=1)}},I=function(e,t){var n={target:e,props:[],revert:k,save:D};return e._gsap||u.os.core.getCache(e),t&&e.style&&e.nodeType&&t.split(",").forEach(function(e){return n.save(e)}),n},z=function(e,t){var n=r.createElementNS?r.createElementNS((t||"http://www.w3.org/1999/xhtml").replace(/^https/,"http"),e):r.createElement(e);return n&&n.style?n:r.createElement(e)},U=function e(t,n,r){var i=getComputedStyle(t);return i[n]||i.getPropertyValue(n.replace(v,"-$1").toLowerCase())||i.getPropertyValue(n)||!r&&e(t,N(n)||n,1)||""},F="O,Moz,ms,Ms,Webkit".split(","),N=function(e,t,n){var r=(t||a).style,i=5;if(e in r&&!n)return e;for(e=e.charAt(0).toUpperCase()+e.substr(1);i--&&!(F[i]+e in r););return i<0?null:(3===i?"ms":i>=0?F[i]:"")+e},B=function(){"undefined"!=typeof window&&window.document&&(i=(r=window.document).documentElement,a=z("div")||{style:{}},z("div"),L=(T=N(T))+"Origin",a.style.cssText="border-width:0;line-height:0;position:absolute;padding:0",c=!!N("perspective"),l=u.os.core.reverting,o=1)},H=function(e){var t,n=e.ownerSVGElement,r=z("svg",n&&n.getAttribute("xmlns")||"http://www.w3.org/2000/svg"),o=e.cloneNode(!0);o.style.display="block",r.appendChild(o),i.appendChild(r);try{t=o.getBBox()}catch(e){}return r.removeChild(o),i.removeChild(r),t},q=function(e,t){for(var n=t.length;n--;)if(e.hasAttribute(t[n]))return e.getAttribute(t[n])},Y=function(e){var t,n;try{t=e.getBBox()}catch(r){t=H(e),n=1}return t&&(t.width||t.height)||n||(t=H(e)),!t||t.width||t.x||t.y?t:{x:+q(e,["x","cx","x1"])||0,y:+q(e,["y","cy","y1"])||0,width:0,height:0}},G=function(e){return!!(e.getCTM&&(!e.parentNode||e.ownerSVGElement)&&Y(e))},W=function(e,t){if(t){var n,r=e.style;t in d&&t!==L&&(t=T),r.removeProperty?(("ms"===(n=t.substr(0,2))||"webkit"===t.substr(0,6))&&(t="-"+t),r.removeProperty("--"===n?t:t.replace(v,"-$1").toLowerCase())):r.removeAttribute(t)}},X=function(e,t,n,r,i,o){var a=new u.J7(e._pt,t,n,0,1,o?S:_);return e._pt=a,a.b=r,a.e=i,e._props.push(n),a},K={deg:1,rad:1,turn:1},V={grid:1,flex:1},$=function e(t,n,i,o){var s,l,c,f,p=parseFloat(i)||0,h=(i+"").trim().substr((p+"").length)||"px",v=a.style,g=m.test(n),b="svg"===t.tagName.toLowerCase(),y=(b?"client":"offset")+(g?"Width":"Height"),w="px"===o,x="%"===o;if(o===h||!p||K[o]||K[h])return p;if("px"===h||w||(p=e(t,n,i,"px")),f=t.getCTM&&G(t),(x||"%"===h)&&(d[n]||~n.indexOf("adius")))return s=f?t.getBBox()[g?"width":"height"]:t[y],(0,u.E_)(x?p/s*100:p/100*s);if(v[g?"width":"height"]=100+(w?h:o),l="rem"!==o&&~n.indexOf("adius")||"em"===o&&t.appendChild&&!b?t:t.parentNode,f&&(l=(t.ownerSVGElement||{}).parentNode),l&&l!==r&&l.appendChild||(l=r.body),(c=l._gsap)&&x&&c.width&&g&&c.time===u.au.time&&!c.uncache)return(0,u.E_)(p/c.width*100);if(x&&("height"===n||"width"===n)){var E=t.style[n];t.style[n]=100+o,s=t[y],E?t.style[n]=E:W(t,n)}else(x||"%"===h)&&!V[U(l,"display")]&&(v.position=U(t,"position")),l===t&&(v.position="static"),l.appendChild(a),s=a[y],l.removeChild(a),v.position="absolute";return g&&x&&((c=(0,u.a0)(l)).time=u.au.time,c.width=l[y]),(0,u.E_)(w?s*p/100:s&&p?100/s*p:0)},Z=function(e,t,n,r){var i;return o||B(),t in b&&"transform"!==t&&~(t=b[t]).indexOf(",")&&(t=t.split(",")[0]),d[t]&&"transform"!==t?(i=ec(e,r),i="transformOrigin"!==t?i[t]:i.svg?i.origin:eu(U(e,L))+" "+i.zOrigin+"px"):(!(i=e.style[t])||"auto"===i||r||~(i+"").indexOf("calc("))&&(i=en[t]&&en[t](e,t,n)||U(e,t)||(0,u.n)(e,t)||+("opacity"===t)),n&&!~(i+"").trim().indexOf(" ")?$(e,t,i,n)+n:i},Q=function(e,t,n,r){if(!n||"none"===n){var i=N(t,e,1),o=i&&U(e,i,1);o&&o!==n?(t=i,n=o):"borderColor"===t&&(n=U(e,"borderTopColor"))}var a,s,l,c,d,f,p,h,v,m,g,b=new u.J7(this._pt,e.style,t,0,1,u.l1),y=0,w=0;if(b.b=n,b.e=r,n+="","var(--"===(r+="").substring(0,6)&&(r=U(e,r.substring(4,r.indexOf(")")))),"auto"===r&&(f=e.style[t],e.style[t]=r,r=U(e,t)||r,f?e.style[t]=f:W(e,t)),a=[n,r],(0,u.Uc)(a),n=a[0],r=a[1],l=n.match(u.vM)||[],(r.match(u.vM)||[]).length){for(;s=u.vM.exec(r);)p=s[0],v=r.substring(y,s.index),d?d=(d+1)%5:("rgba("===v.substr(-5)||"hsla("===v.substr(-5))&&(d=1),p!==(f=l[w++]||"")&&(c=parseFloat(f)||0,g=f.substr((c+"").length),"="===p.charAt(1)&&(p=(0,u.B0)(c,p)+g),h=parseFloat(p),m=p.substr((h+"").length),y=u.vM.lastIndex-m.length,m||(m=m||u.Yz.units[t]||g,y===r.length&&(r+=m,b.e+=m)),g!==m&&(c=$(e,t,f,m)||0),b._pt={_next:b._pt,p:v||1===w?v:",",s:c,c:h-c,m:d&&d<4||"zIndex"===t?Math.round:0});b.c=y<r.length?r.substring(y,r.length):""}else b.r="display"===t&&"none"===r?S:_;return u.Ks.test(r)&&(b.e=0),this._pt=b,b},J={top:"0%",bottom:"100%",left:"0%",right:"100%",center:"50%"},ee=function(e){var t=e.split(" "),n=t[0],r=t[1]||"50%";return("top"===n||"bottom"===n||"left"===r||"right"===r)&&(e=n,n=r,r=e),t[0]=J[n]||n,t[1]=J[r]||r,t.join(" ")},et=function(e,t){if(t.tween&&t.tween._time===t.tween._dur){var n,r,i,o=t.t,a=o.style,s=t.u,l=o._gsap;if("all"===s||!0===s)a.cssText="",r=1;else for(i=(s=s.split(",")).length;--i>-1;)d[n=s[i]]&&(r=1,n="transformOrigin"===n?L:T),W(o,n);r&&(W(o,T),l&&(l.svg&&o.removeAttribute("transform"),a.scale=a.rotate=a.translate="none",ec(o,1),l.uncache=1,R(a)))}},en={clearProps:function(e,t,n,r,i){if("isFromStart"!==i.data){var o=e._pt=new u.J7(e._pt,t,n,0,0,et);return o.u=r,o.pr=-10,o.tween=i,e._props.push(n),1}}},er=[1,0,0,1,0,0],ei={},eo=function(e){return"matrix(1, 0, 0, 1, 0, 0)"===e||"none"===e||!e},ea=function(e){var t=U(e,T);return eo(t)?er:t.substr(7).match(u.vX).map(u.E_)},es=function(e,t){var n,r,o,a,s=e._gsap||(0,u.a0)(e),l=e.style,c=ea(e);return s.svg&&e.getAttribute("transform")?"1,0,0,1,0,0"===(c=[(o=e.transform.baseVal.consolidate().matrix).a,o.b,o.c,o.d,o.e,o.f]).join(",")?er:c:(c!==er||e.offsetParent||e===i||s.svg||(o=l.display,l.display="block",(n=e.parentNode)&&(e.offsetParent||e.getBoundingClientRect().width)||(a=1,r=e.nextElementSibling,i.appendChild(e)),c=ea(e),o?l.display=o:W(e,"display"),a&&(r?n.insertBefore(e,r):n?n.appendChild(e):i.removeChild(e))),t&&c.length>6?[c[0],c[1],c[4],c[5],c[12],c[13]]:c)},el=function(e,t,n,r,i,o){var a,s,l,c,u=e._gsap,d=i||es(e,!0),f=u.xOrigin||0,p=u.yOrigin||0,h=u.xOffset||0,v=u.yOffset||0,m=d[0],g=d[1],b=d[2],y=d[3],w=d[4],x=d[5],E=t.split(" "),_=parseFloat(E[0])||0,S=parseFloat(E[1])||0;n?d!==er&&(s=m*y-g*b)&&(l=y/s*_+-b/s*S+(b*x-y*w)/s,c=-g/s*_+m/s*S-(m*x-g*w)/s,_=l,S=c):(_=(a=Y(e)).x+(~E[0].indexOf("%")?_/100*a.width:_),S=a.y+(~(E[1]||E[0]).indexOf("%")?S/100*a.height:S)),r||!1!==r&&u.smooth?(u.xOffset=h+((w=_-f)*m+(x=S-p)*b)-w,u.yOffset=v+(w*g+x*y)-x):u.xOffset=u.yOffset=0,u.xOrigin=_,u.yOrigin=S,u.smooth=!!r,u.origin=t,u.originIsAbsolute=!!n,e.style[L]="0px 0px",o&&(X(o,u,"xOrigin",f,_),X(o,u,"yOrigin",p,S),X(o,u,"xOffset",h,u.xOffset),X(o,u,"yOffset",v,u.yOffset)),e.setAttribute("data-svg-origin",_+" "+S)},ec=function(e,t){var n=e._gsap||new u.n6(e);if("x"in n&&!t&&!n.uncache)return n;var r,i,o,a,s,l,d,v,m,g,b,y,w,x,E,_,S,M,O,j,A,C,P,D,R,k,I,z,F,N,B,H,q=e.style,Y=n.scaleX<0,W=getComputedStyle(e),X=U(e,L)||"0";return r=i=o=l=d=v=m=g=b=0,a=s=1,n.svg=!!(e.getCTM&&G(e)),W.translate&&(("none"!==W.translate||"none"!==W.scale||"none"!==W.rotate)&&(q[T]=("none"!==W.translate?"translate3d("+(W.translate+" 0 0").split(" ").slice(0,3).join(", ")+") ":"")+("none"!==W.rotate?"rotate("+W.rotate+") ":"")+("none"!==W.scale?"scale("+W.scale.split(" ").join(",")+") ":"")+("none"!==W[T]?W[T]:"")),q.scale=q.rotate=q.translate="none"),x=es(e,n.svg),n.svg&&(n.uncache?(R=e.getBBox(),X=n.xOrigin-R.x+"px "+(n.yOrigin-R.y)+"px",D=""):D=!t&&e.getAttribute("data-svg-origin"),el(e,D||X,!!D||n.originIsAbsolute,!1!==n.smooth,x)),y=n.xOrigin||0,w=n.yOrigin||0,x!==er&&(M=x[0],O=x[1],j=x[2],A=x[3],r=C=x[4],i=P=x[5],6===x.length?(a=Math.sqrt(M*M+O*O),s=Math.sqrt(A*A+j*j),l=M||O?h(O,M)*f:0,(m=j||A?h(j,A)*f+l:0)&&(s*=Math.abs(Math.cos(m*p))),n.svg&&(r-=y-(y*M+w*j),i-=w-(y*O+w*A))):(H=x[6],N=x[7],I=x[8],z=x[9],F=x[10],B=x[11],r=x[12],i=x[13],o=x[14],d=(E=h(H,F))*f,E&&(D=C*(_=Math.cos(-E))+I*(S=Math.sin(-E)),R=P*_+z*S,k=H*_+F*S,I=-(C*S)+I*_,z=-(P*S)+z*_,F=-(H*S)+F*_,B=-(N*S)+B*_,C=D,P=R,H=k),v=(E=h(-j,F))*f,E&&(D=M*(_=Math.cos(-E))-I*(S=Math.sin(-E)),R=O*_-z*S,k=j*_-F*S,B=A*S+B*_,M=D,O=R,j=k),l=(E=h(O,M))*f,E&&(D=M*(_=Math.cos(E))+O*(S=Math.sin(E)),R=C*_+P*S,O=O*_-M*S,P=P*_-C*S,M=D,C=R),d&&Math.abs(d)+Math.abs(l)>359.9&&(d=l=0,v=180-v),a=(0,u.E_)(Math.sqrt(M*M+O*O+j*j)),s=(0,u.E_)(Math.sqrt(P*P+H*H)),m=Math.abs(E=h(C,P))>2e-4?E*f:0,b=B?1/(B<0?-B:B):0),n.svg&&(D=e.getAttribute("transform"),n.forceCSS=e.setAttribute("transform","")||!eo(U(e,T)),D&&e.setAttribute("transform",D))),Math.abs(m)>90&&270>Math.abs(m)&&(Y?(a*=-1,m+=l<=0?180:-180,l+=l<=0?180:-180):(s*=-1,m+=m<=0?180:-180)),t=t||n.uncache,n.x=r-((n.xPercent=r&&(!t&&n.xPercent||(Math.round(e.offsetWidth/2)===Math.round(-r)?-50:0)))?e.offsetWidth*n.xPercent/100:0)+"px",n.y=i-((n.yPercent=i&&(!t&&n.yPercent||(Math.round(e.offsetHeight/2)===Math.round(-i)?-50:0)))?e.offsetHeight*n.yPercent/100:0)+"px",n.z=o+"px",n.scaleX=(0,u.E_)(a),n.scaleY=(0,u.E_)(s),n.rotation=(0,u.E_)(l)+"deg",n.rotationX=(0,u.E_)(d)+"deg",n.rotationY=(0,u.E_)(v)+"deg",n.skewX=m+"deg",n.skewY=g+"deg",n.transformPerspective=b+"px",(n.zOrigin=parseFloat(X.split(" ")[2])||!t&&n.zOrigin||0)&&(q[L]=eu(X)),n.xOffset=n.yOffset=0,n.force3D=u.Yz.force3D,n.renderTransform=n.svg?ev:c?eh:ef,n.uncache=0,n},eu=function(e){return(e=e.split(" "))[0]+" "+e[1]},ed=function(e,t,n){var r=(0,u.l_)(t);return(0,u.E_)(parseFloat(t)+parseFloat($(e,"x",n+"px",r)))+r},ef=function(e,t){t.z="0px",t.rotationY=t.rotationX="0deg",t.force3D=0,eh(e,t)},ep="0deg",eh=function(e,t){var n=t||this,r=n.xPercent,i=n.yPercent,o=n.x,a=n.y,s=n.z,l=n.rotation,c=n.rotationY,u=n.rotationX,d=n.skewX,f=n.skewY,h=n.scaleX,v=n.scaleY,m=n.transformPerspective,g=n.force3D,b=n.target,y=n.zOrigin,w="",x="auto"===g&&e&&1!==e||!0===g;if(y&&(u!==ep||c!==ep)){var E,_=parseFloat(c)*p,S=Math.sin(_),M=Math.cos(_);o=ed(b,o,-(S*(E=Math.cos(_=parseFloat(u)*p))*y)),a=ed(b,a,-(-Math.sin(_)*y)),s=ed(b,s,-(M*E*y)+y)}"0px"!==m&&(w+="perspective("+m+") "),(r||i)&&(w+="translate("+r+"%, "+i+"%) "),(x||"0px"!==o||"0px"!==a||"0px"!==s)&&(w+="0px"!==s||x?"translate3d("+o+", "+a+", "+s+") ":"translate("+o+", "+a+") "),l!==ep&&(w+="rotate("+l+") "),c!==ep&&(w+="rotateY("+c+") "),u!==ep&&(w+="rotateX("+u+") "),(d!==ep||f!==ep)&&(w+="skew("+d+", "+f+") "),(1!==h||1!==v)&&(w+="scale("+h+", "+v+") "),b.style[T]=w||"translate(0, 0)"},ev=function(e,t){var n,r,i,o,a,s=t||this,l=s.xPercent,c=s.yPercent,d=s.x,f=s.y,h=s.rotation,v=s.skewX,m=s.skewY,g=s.scaleX,b=s.scaleY,y=s.target,w=s.xOrigin,x=s.yOrigin,E=s.xOffset,_=s.yOffset,S=s.forceCSS,M=parseFloat(d),O=parseFloat(f);h=parseFloat(h),v=parseFloat(v),(m=parseFloat(m))&&(v+=m=parseFloat(m),h+=m),h||v?(h*=p,v*=p,n=Math.cos(h)*g,r=Math.sin(h)*g,i=-(Math.sin(h-v)*b),o=Math.cos(h-v)*b,v&&(m*=p,i*=a=Math.sqrt(1+(a=Math.tan(v-m))*a),o*=a,m&&(n*=a=Math.sqrt(1+(a=Math.tan(m))*a),r*=a)),n=(0,u.E_)(n),r=(0,u.E_)(r),i=(0,u.E_)(i),o=(0,u.E_)(o)):(n=g,o=b,r=i=0),(M&&!~(d+"").indexOf("px")||O&&!~(f+"").indexOf("px"))&&(M=$(y,"x",d,"px"),O=$(y,"y",f,"px")),(w||x||E||_)&&(M=(0,u.E_)(M+w-(w*n+x*i)+E),O=(0,u.E_)(O+x-(w*r+x*o)+_)),(l||c)&&(a=y.getBBox(),M=(0,u.E_)(M+l/100*a.width),O=(0,u.E_)(O+c/100*a.height)),a="matrix("+n+","+r+","+i+","+o+","+M+","+O+")",y.setAttribute("transform",a),S&&(y.style[T]=a)},em=function(e,t,n,r,i){var o,a,s=(0,u.vQ)(i),l=parseFloat(i)*(s&&~i.indexOf("rad")?f:1)-r,c=r+l+"deg";return s&&("short"===(o=i.split("_")[1])&&(l%=360)!=l%180&&(l+=l<0?360:-360),"cw"===o&&l<0?l=(l+36e9)%360-360*~~(l/360):"ccw"===o&&l>0&&(l=(l-36e9)%360-360*~~(l/360))),e._pt=a=new u.J7(e._pt,t,n,r,l,w),a.e=c,a.u="deg",e._props.push(n),a},eg=function(e,t){for(var n in t)e[n]=t[n];return e},eb=function(e,t,n){var r,i,o,a,s,l,c,f=eg({},n._gsap),p=n.style;for(i in f.svg?(o=n.getAttribute("transform"),n.setAttribute("transform",""),p[T]=t,r=ec(n,1),W(n,T),n.setAttribute("transform",o)):(o=getComputedStyle(n)[T],p[T]=t,r=ec(n,1),p[T]=o),d)(o=f[i])!==(a=r[i])&&0>"perspective,force3D,transformOrigin,svgOrigin".indexOf(i)&&(s=(0,u.l_)(o)!==(c=(0,u.l_)(a))?$(n,i,o,c):parseFloat(o),l=parseFloat(a),e._pt=new u.J7(e._pt,r,i,s,l-s,y),e._pt.u=c||0,e._props.push(i));eg(r,f)};(0,u.fA)("padding,margin,Width,Radius",function(e,t){var n="Right",r="Bottom",i="Left",o=(t<3?["Top",n,r,i]:["Top"+i,"Top"+n,r+n,r+i]).map(function(n){return t<2?e+n:"border"+n+e});en[t>1?"border"+e:e]=function(e,t,n,r,i){var a,s;if(arguments.length<4)return 5===(s=(a=o.map(function(t){return Z(e,t,n)})).join(" ")).split(a[0]).length?a[0]:s;a=(r+"").split(" "),s={},o.forEach(function(e,t){return s[e]=a[t]=a[t]||a[(t-1)/2|0]}),e.init(t,s,i)}});var ey={name:"css",register:B,targetTest:function(e){return e.style&&e.nodeType},init:function(e,t,n,r,i){var a,s,l,c,f,p,h,v,m,w,_,S,M,O,j,A,C=this._props,P=e.style,D=n.vars.startAt;for(h in o||B(),this.styles=this.styles||I(e),A=this.styles.props,this.tween=n,t)if("autoRound"!==h&&(s=t[h],!(u.wU[h]&&(0,u.Zm)(h,t,n,r,e,i)))){if(f=typeof s,p=en[h],"function"===f&&(f=typeof(s=s.call(n,r,e,i))),"string"===f&&~s.indexOf("random(")&&(s=(0,u.Vy)(s)),p)p(this,e,h,s,n)&&(j=1);else if("--"===h.substr(0,2))a=(getComputedStyle(e).getPropertyValue(h)+"").trim(),s+="",u.qA.lastIndex=0,u.qA.test(a)||(v=(0,u.l_)(a),m=(0,u.l_)(s)),m?v!==m&&(a=$(e,h,a,m)+m):v&&(s+=v),this.add(P,"setProperty",a,s,r,i,0,0,h),C.push(h),A.push(h,0,P[h]);else if("undefined"!==f){if(D&&h in D?(a="function"==typeof D[h]?D[h].call(n,r,e,i):D[h],(0,u.vQ)(a)&&~a.indexOf("random(")&&(a=(0,u.Vy)(a)),(0,u.l_)(a+"")||"auto"===a||(a+=u.Yz.units[h]||(0,u.l_)(Z(e,h))||""),"="===(a+"").charAt(1)&&(a=Z(e,h))):a=Z(e,h),c=parseFloat(a),(w="string"===f&&"="===s.charAt(1)&&s.substr(0,2))&&(s=s.substr(2)),l=parseFloat(s),h in b&&("autoAlpha"===h&&(1===c&&"hidden"===Z(e,"visibility")&&l&&(c=0),A.push("visibility",0,P.visibility),X(this,P,"visibility",c?"inherit":"hidden",l?"inherit":"hidden",!l)),"scale"!==h&&"transform"!==h&&~(h=b[h]).indexOf(",")&&(h=h.split(",")[0])),_=h in d){if(this.styles.save(h),"string"===f&&"var(--"===s.substring(0,6)&&(l=parseFloat(s=U(e,s.substring(4,s.indexOf(")"))))),S||((M=e._gsap).renderTransform&&!t.parseTransform||ec(e,t.parseTransform),O=!1!==t.smoothOrigin&&M.smooth,(S=this._pt=new u.J7(this._pt,P,T,0,1,M.renderTransform,M,0,-1)).dep=1),"scale"===h)this._pt=new u.J7(this._pt,M,"scaleY",M.scaleY,(w?(0,u.B0)(M.scaleY,w+l):l)-M.scaleY||0,y),this._pt.u=0,C.push("scaleY",h),h+="X";else if("transformOrigin"===h){A.push(L,0,P[L]),s=ee(s),M.svg?el(e,s,0,O,0,this):((m=parseFloat(s.split(" ")[2])||0)!==M.zOrigin&&X(this,M,"zOrigin",M.zOrigin,m),X(this,P,h,eu(a),eu(s)));continue}else if("svgOrigin"===h){el(e,s,1,O,0,this);continue}else if(h in ei){em(this,M,h,c,w?(0,u.B0)(c,w+s):s);continue}else if("smoothOrigin"===h){X(this,M,"smooth",M.smooth,s);continue}else if("force3D"===h){M[h]=s;continue}else if("transform"===h){eb(this,s,e);continue}}else h in P||(h=N(h)||h);if(_||(l||0===l)&&(c||0===c)&&!g.test(s)&&h in P)v=(a+"").substr((c+"").length),l||(l=0),m=(0,u.l_)(s)||(h in u.Yz.units?u.Yz.units[h]:v),v!==m&&(c=$(e,h,a,m)),this._pt=new u.J7(this._pt,_?M:P,h,c,(w?(0,u.B0)(c,w+l):l)-c,!_&&("px"===m||"zIndex"===h)&&!1!==t.autoRound?E:y),this._pt.u=m||0,v!==m&&"%"!==m&&(this._pt.b=a,this._pt.r=x);else if(h in P)Q.call(this,e,h,a,w?w+s:s);else if(h in e)this.add(e,h,a||e[h],w?w+s:s,r,i);else if("parseTransform"!==h){(0,u.dg)(h,s);continue}_||(h in P?A.push(h,0,P[h]):"function"==typeof e[h]?A.push(h,2,e[h]()):A.push(h,1,a||e[h])),C.push(h)}}j&&(0,u.St)(this)},render:function(e,t){if(t.tween._time||!l())for(var n=t._pt;n;)n.r(e,n.d),n=n._next;else t.styles.revert()},get:Z,aliases:b,getSetter:function(e,t,n){var r=b[t];return r&&0>r.indexOf(",")&&(t=r),t in d&&t!==L&&(e._gsap.x||Z(e,"x"))?n&&s===n?"scale"===t?A:j:(s=n||{},"scale"===t?C:P):e.style&&!(0,u.OF)(e.style[t])?M:~t.indexOf("-")?O:(0,u.Dx)(e,t)},core:{_removeProperty:W,_getMatrix:es}};u.os.utils.checkPrefix=N,u.os.core.getStyleSaver=I,function(e,t,n,r){var i=(0,u.fA)(e+","+t+","+n,function(e){d[e]=1});(0,u.fA)(t,function(e){u.Yz.units[e]="deg",ei[e]=1}),b[i[13]]=e+","+t,(0,u.fA)(r,function(e){var t=e.split(":");b[t[1]]=i[t[0]]})}("x,y,z,scale,scaleX,scaleY,xPercent,yPercent","rotation,rotationX,rotationY,skewX,skewY","transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective","0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY"),(0,u.fA)("x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective",function(e){u.Yz.units[e]="px"}),u.os.registerPlugin(ey);var ew=u.os.registerPlugin(ey)||u.os;ew.core.Tween},3353:(e,t,n)=>{let r,i,o,a,s;n.d(t,{B:()=>C,C:()=>Q,D:()=>J,E:()=>P,a:()=>j,b:()=>O,c:()=>eE,d:()=>eS,e:()=>es,f:()=>ez,i:()=>S,m:()=>eR,u:()=>A});var l=n(4364),c=n.t(l,2),u=n(4644),d=n(2331),f=n(7964),p=n(8700),h=n(1978);let{useSyncExternalStoreWithSelector:v}=p,m=(e,t)=>{let n=(0,h.y)(e),r=(e,r=t)=>(function(e,t=e=>e,n){let r=v(e.subscribe,e.getState,e.getInitialState,t,n);return l.useDebugValue(r),r})(n,e,r);return Object.assign(r,n),r};var g=n(6935),b=n(7969),y=n.n(b),w=n(4762),x=n(6496),E=n(7795);function _(e){let t=e.root;for(;t.getState().previousRoot;)t=t.getState().previousRoot;return t}c.act;let S=e=>e&&e.hasOwnProperty("current"),M=e=>null!=e&&("string"==typeof e||"number"==typeof e||e.isColor),O=((e,t)=>"undefined"!=typeof window&&((null==(e=window.document)?void 0:e.createElement)||(null==(t=window.navigator)?void 0:t.product)==="ReactNative"))()?l.useLayoutEffect:l.useEffect;function j(e){let t=l.useRef(e);return O(()=>void(t.current=e),[e]),t}function A(){let e=(0,E.u5)(),t=(0,E.y3)();return l.useMemo(()=>({children:n})=>{let r=(0,E.Nz)(e,!0,e=>e.type===l.StrictMode)?l.StrictMode:l.Fragment;return(0,x.jsx)(r,{children:(0,x.jsx)(t,{children:n})})},[e,t])}function C({set:e}){return O(()=>(e(new Promise(()=>null)),()=>e(!1)),[e]),null}let P=(e=>((e=class extends l.Component{constructor(...e){super(...e),this.state={error:!1}}componentDidCatch(e){this.props.set(e)}render(){return this.state.error?null:this.props.children}}).getDerivedStateFromError=()=>({error:!0}),e))();function T(e){var t;let n="undefined"!=typeof window?null!=(t=window.devicePixelRatio)?t:2:1;return Array.isArray(e)?Math.min(Math.max(e[0],n),e[1]):e}function L(e){var t;return null==(t=e.__r3f)?void 0:t.root.getState()}let D={obj:e=>e===Object(e)&&!D.arr(e)&&"function"!=typeof e,fun:e=>"function"==typeof e,str:e=>"string"==typeof e,num:e=>"number"==typeof e,boo:e=>"boolean"==typeof e,und:e=>void 0===e,nul:e=>null===e,arr:e=>Array.isArray(e),equ(e,t,{arrays:n="shallow",objects:r="reference",strict:i=!0}={}){let o;if(typeof e!=typeof t||!!e!=!!t)return!1;if(D.str(e)||D.num(e)||D.boo(e))return e===t;let a=D.obj(e);if(a&&"reference"===r)return e===t;let s=D.arr(e);if(s&&"reference"===n)return e===t;if((s||a)&&e===t)return!0;for(o in e)if(!(o in t))return!1;if(a&&"shallow"===n&&"shallow"===r){for(o in i?t:e)if(!D.equ(e[o],t[o],{strict:i,objects:"reference"}))return!1}else for(o in i?t:e)if(e[o]!==t[o])return!1;if(D.und(o)){if(s&&0===e.length&&0===t.length||a&&0===Object.keys(e).length&&0===Object.keys(t).length)return!0;if(e!==t)return!1}return!0}},R=["children","key","ref"];function k(e,t,n,r){let i=null==e?void 0:e.__r3f;return!i&&(i={root:t,type:n,parent:null,children:[],props:function(e){let t={};for(let n in e)R.includes(n)||(t[n]=e[n]);return t}(r),object:e,eventCount:0,handlers:{},isHidden:!1},e&&(e.__r3f=i)),i}function I(e,t){if(!t.includes("-")||t in e)return{root:e,key:t,target:e[t]};let n=e,r=t.split("-");for(let i of r){if("object"!=typeof n||null===n){if(void 0!==n)return{root:n,key:r.slice(r.indexOf(i)).join("-"),target:void 0};return{root:e,key:t,target:void 0}}t=i,e=n,n=n[t]}return{root:e,key:t,target:n}}let z=/-\d+$/;function U(e,t){if(D.str(t.props.attach)){if(z.test(t.props.attach)){let n=t.props.attach.replace(z,""),{root:r,key:i}=I(e.object,n);Array.isArray(r[i])||(r[i]=[])}let{root:n,key:r}=I(e.object,t.props.attach);t.previousAttach=n[r],n[r]=t.object}else D.fun(t.props.attach)&&(t.previousAttach=t.props.attach(e.object,t.object))}function F(e,t){if(D.str(t.props.attach)){let{root:n,key:r}=I(e.object,t.props.attach),i=t.previousAttach;void 0===i?delete n[r]:n[r]=i}else null==t.previousAttach||t.previousAttach(e.object,t.object);delete t.previousAttach}let N=[...R,"args","dispose","attach","object","onUpdate","dispose"],B=new Map,H=["map","emissiveMap","sheenColorMap","specularColorMap","envMap"],q=/^on(Pointer|Click|DoubleClick|ContextMenu|Wheel)/;function Y(e,t){var n,r;let i=e.__r3f,o=i&&_(i).getState(),a=null==i?void 0:i.eventCount;for(let n in t){let a=t[n];if(N.includes(n))continue;if(i&&q.test(n)){"function"==typeof a?i.handlers[n]=a:delete i.handlers[n],i.eventCount=Object.keys(i.handlers).length;continue}if(void 0===a)continue;let{root:s,key:l,target:c}=I(e,n);if(void 0===c&&("object"!=typeof s||null===s))throw Error(`R3F: Cannot set "${n}". Ensure it is an object before setting "${l}".`);c instanceof d.zgK&&a instanceof d.zgK?c.mask=a.mask:c instanceof d.Q1f&&M(a)?c.set(a):null!==c&&"object"==typeof c&&"function"==typeof c.set&&"function"==typeof c.copy&&null!=a&&a.constructor&&c.constructor===a.constructor?c.copy(a):null!==c&&"object"==typeof c&&"function"==typeof c.set&&Array.isArray(a)?"function"==typeof c.fromArray?c.fromArray(a):c.set(...a):null!==c&&"object"==typeof c&&"function"==typeof c.set&&"number"==typeof a?"function"==typeof c.setScalar?c.setScalar(a):c.set(a):(s[l]=a,o&&!o.linear&&H.includes(l)&&null!=(r=s[l])&&r.isTexture&&s[l].format===d.GWd&&s[l].type===d.OUM&&(s[l].colorSpace=d.er$))}if(null!=i&&i.parent&&null!=o&&o.internal&&null!=(n=i.object)&&n.isObject3D&&a!==i.eventCount){let e=i.object,t=o.internal.interaction.indexOf(e);t>-1&&o.internal.interaction.splice(t,1),i.eventCount&&null!==e.raycast&&o.internal.interaction.push(e)}return i&&void 0===i.props.attach&&(i.object.isBufferGeometry?i.props.attach="geometry":i.object.isMaterial&&(i.props.attach="material")),i&&G(i),e}function G(e){var t;if(!e.parent)return;null==e.props.onUpdate||e.props.onUpdate(e.object);let n=null==(t=e.root)||null==t.getState?void 0:t.getState();n&&0===n.internal.frames&&n.invalidate()}let W=e=>null==e?void 0:e.isObject3D;function X(e){return(e.eventObject||e.object).uuid+"/"+e.index+e.instanceId}function K(e,t,n,r){let i=n.get(t);i&&(n.delete(t),0===n.size&&(e.delete(r),i.target.releasePointerCapture(r)))}let V=e=>!!(null!=e&&e.render),$=l.createContext(null);function Z(){let e=l.useContext($);if(!e)throw Error("R3F: Hooks can only be used within the Canvas component!");return e}function Q(e=e=>e,t){return Z()(e,t)}function J(e,t=0){let n=Z(),r=n.getState().internal.subscribe,i=j(e);return O(()=>r(i,t,n),[t,r,n]),null}let ee=new WeakMap;function et(e,t){return function(n,...r){var i;let o;return"function"==typeof n&&(null==n||null==(i=n.prototype)?void 0:i.constructor)===n?(o=ee.get(n))||(o=new n,ee.set(n,o)):o=n,e&&e(o),Promise.all(r.map(e=>new Promise((n,r)=>o.load(e,e=>{W(null==e?void 0:e.scene)&&Object.assign(e,function(e){let t={nodes:{},materials:{},meshes:{}};return e&&e.traverse(e=>{e.name&&(t.nodes[e.name]=e),e.material&&!t.materials[e.material.name]&&(t.materials[e.material.name]=e.material),e.isMesh&&!t.meshes[e.name]&&(t.meshes[e.name]=e)}),t}(e.scene)),n(e)},t,t=>r(Error(`Could not load ${e}: ${null==t?void 0:t.message}`))))))}}function en(e,t,n,r){let i=Array.isArray(t)?t:[t],o=(0,g.DY)(et(n,r),[e,...i],{equal:D.equ});return Array.isArray(t)?o:o[0]}en.preload=function(e,t,n){let r=Array.isArray(t)?t:[t];return(0,g.uv)(et(n),[e,...r])},en.clear=function(e,t){let n=Array.isArray(t)?t:[t];return(0,g.IU)([e,...n])};let er={},ei=/^three(?=[A-Z])/,eo=e=>`${e[0].toUpperCase()}${e.slice(1)}`,ea=0;function es(e){if("function"==typeof e){let t=`${ea++}`;return er[t]=e,t}Object.assign(er,e)}function el(e,t){let n=eo(e),r=er[n];if("primitive"!==e&&!r)throw Error(`R3F: ${n} is not part of the THREE namespace! Did you forget to extend? See: https://docs.pmnd.rs/react-three-fiber/api/objects#using-3rd-party-objects-declaratively`);if("primitive"===e&&!t.object)throw Error("R3F: Primitives without 'object' are invalid!");if(void 0!==t.args&&!Array.isArray(t.args))throw Error("R3F: The args prop must be an array!")}function ec(e){if(e.isHidden){var t;e.props.attach&&null!=(t=e.parent)&&t.object?U(e.parent,e):W(e.object)&&!1!==e.props.visible&&(e.object.visible=!0),e.isHidden=!1,G(e)}}function eu(e,t,n){let r=t.root.getState();if(e.parent||e.object===r.scene){if(!t.object){var i,o;let e=er[eo(t.type)];t.object=null!=(i=t.props.object)?i:new e(...null!=(o=t.props.args)?o:[]),t.object.__r3f=t}if(Y(t.object,t.props),t.props.attach)U(e,t);else if(W(t.object)&&W(e.object)){let r=e.object.children.indexOf(null==n?void 0:n.object);if(n&&-1!==r){let n=e.object.children.indexOf(t.object);-1!==n?(e.object.children.splice(n,1),e.object.children.splice(n<r?r-1:r,0,t.object)):(t.object.parent=e.object,e.object.children.splice(r,0,t.object),t.object.dispatchEvent({type:"added"}),e.object.dispatchEvent({type:"childadded",child:t.object}))}else e.object.add(t.object)}for(let e of t.children)eu(t,e);G(t)}}function ed(e,t){t&&(t.parent=e,e.children.push(t),eu(e,t))}function ef(e,t,n){if(!t||!n)return;t.parent=e;let r=e.children.indexOf(n);-1!==r?e.children.splice(r,0,t):e.children.push(t),eu(e,t,n)}function ep(e){if("function"==typeof e.dispose){let t=()=>{try{e.dispose()}catch{}};"undefined"!=typeof IS_REACT_ACT_ENVIRONMENT?t():(0,w.unstable_scheduleCallback)(w.unstable_IdlePriority,t)}}function eh(e,t,n){if(!t)return;t.parent=null;let r=e.children.indexOf(t);-1!==r&&e.children.splice(r,1),t.props.attach?F(e,t):W(t.object)&&W(e.object)&&(e.object.remove(t.object),function(e,t){let{internal:n}=e.getState();n.interaction=n.interaction.filter(e=>e!==t),n.initialHits=n.initialHits.filter(e=>e!==t),n.hovered.forEach((e,r)=>{(e.eventObject===t||e.object===t)&&n.hovered.delete(r)}),n.capturedMap.forEach((e,r)=>{K(n.capturedMap,t,e,r)})}(_(t),t.object));let i=null!==t.props.dispose&&!1!==n;for(let e=t.children.length-1;e>=0;e--){let n=t.children[e];eh(t,n,i)}t.children.length=0,delete t.object.__r3f,i&&"primitive"!==t.type&&"Scene"!==t.object.type&&ep(t.object),void 0===n&&G(t)}let ev=[],em=()=>{},eg={},eb=0,ey=function(e){let t=y()(e);return t.injectIntoDevTools(),t}({isPrimaryRenderer:!1,warnsIfNotActing:!1,supportsMutation:!0,supportsPersistence:!1,supportsHydration:!1,createInstance:function(e,t,n){var r;return el(e=eo(e)in er?e:e.replace(ei,""),t),"primitive"===e&&null!=(r=t.object)&&r.__r3f&&delete t.object.__r3f,k(t.object,n,e,t)},removeChild:eh,appendChild:ed,appendInitialChild:ed,insertBefore:ef,appendChildToContainer(e,t){let n=e.getState().scene.__r3f;t&&n&&ed(n,t)},removeChildFromContainer(e,t){let n=e.getState().scene.__r3f;t&&n&&eh(n,t)},insertInContainerBefore(e,t,n){let r=e.getState().scene.__r3f;t&&n&&r&&ef(r,t,n)},getRootHostContext:()=>eg,getChildHostContext:()=>eg,commitUpdate(e,t,n,r,i){var o,a,s;el(t,r);let l=!1;if("primitive"===e.type&&n.object!==r.object||(null==(o=r.args)?void 0:o.length)!==(null==(a=n.args)?void 0:a.length)?l=!0:null!=(s=r.args)&&s.some((e,t)=>{var r;return e!==(null==(r=n.args)?void 0:r[t])})&&(l=!0),l)ev.push([e,{...r},i]);else{let t=function(e,t){let n={};for(let r in t)if(!N.includes(r)&&!D.equ(t[r],e.props[r]))for(let e in n[r]=t[r],t)e.startsWith(`${r}-`)&&(n[e]=t[e]);for(let r in e.props){if(N.includes(r)||t.hasOwnProperty(r))continue;let{root:i,key:o}=I(e.object,r);if(i.constructor&&0===i.constructor.length){let e=function(e){let t=B.get(e.constructor);try{t||(t=new e.constructor,B.set(e.constructor,t))}catch(e){}return t}(i);D.und(e)||(n[o]=e[o])}else n[o]=0}return n}(e,r);Object.keys(t).length&&(Object.assign(e.props,t),Y(e.object,t))}(null===i.sibling||(4&i.flags)==0)&&function(){for(let[e]of ev){let t=e.parent;if(t)for(let n of(e.props.attach?F(t,e):W(e.object)&&W(t.object)&&t.object.remove(e.object),e.children))n.props.attach?F(e,n):W(n.object)&&W(e.object)&&e.object.remove(n.object);e.isHidden&&ec(e),e.object.__r3f&&delete e.object.__r3f,"primitive"!==e.type&&ep(e.object)}for(let[r,i,o]of ev){r.props=i;let a=r.parent;if(a){let i=er[eo(r.type)];r.object=null!=(e=r.props.object)?e:new i(...null!=(t=r.props.args)?t:[]),r.object.__r3f=r;var e,t,n=r.object;for(let e of[o,o.alternate])if(null!==e)if("function"==typeof e.ref){null==e.refCleanup||e.refCleanup();let t=e.ref(n);"function"==typeof t&&(e.refCleanup=t)}else e.ref&&(e.ref.current=n);for(let e of(Y(r.object,r.props),r.props.attach?U(a,r):W(r.object)&&W(a.object)&&a.object.add(r.object),r.children))e.props.attach?U(r,e):W(e.object)&&W(r.object)&&r.object.add(e.object);G(r)}}ev.length=0}()},finalizeInitialChildren:()=>!1,commitMount(){},getPublicInstance:e=>null==e?void 0:e.object,prepareForCommit:()=>null,preparePortalMount:e=>k(e.getState().scene,e,"",{}),resetAfterCommit:()=>{},shouldSetTextContent:()=>!1,clearContainer:()=>!1,hideInstance:function(e){if(!e.isHidden){var t;e.props.attach&&null!=(t=e.parent)&&t.object?F(e.parent,e):W(e.object)&&(e.object.visible=!1),e.isHidden=!0,G(e)}},unhideInstance:ec,createTextInstance:em,hideTextInstance:em,unhideTextInstance:em,scheduleTimeout:"function"==typeof setTimeout?setTimeout:void 0,cancelTimeout:"function"==typeof clearTimeout?clearTimeout:void 0,noTimeout:-1,getInstanceFromNode:()=>null,beforeActiveInstanceBlur(){},afterActiveInstanceBlur(){},detachDeletedInstance(){},prepareScopeUpdate(){},getInstanceFromScope:()=>null,shouldAttemptEagerTransition:()=>!1,trackSchedulerEvent:()=>{},resolveEventType:()=>null,resolveEventTimeStamp:()=>-1.1,requestPostPaintCallback(){},maySuspendCommit:()=>!1,preloadInstance:()=>!0,startSuspendingCommit(){},suspendInstance(){},waitForCommitToBeReady:()=>null,NotPendingTransition:null,HostTransitionContext:l.createContext(null),setCurrentUpdatePriority(e){eb=e},getCurrentUpdatePriority:()=>eb,resolveUpdatePriority(){var e;if(0!==eb)return eb;switch("undefined"!=typeof window&&(null==(e=window.event)?void 0:e.type)){case"click":case"contextmenu":case"dblclick":case"pointercancel":case"pointerdown":case"pointerup":return u.DiscreteEventPriority;case"pointermove":case"pointerout":case"pointerover":case"pointerenter":case"pointerleave":case"wheel":return u.ContinuousEventPriority;default:return u.DefaultEventPriority}},resetFormInstance(){},rendererPackageName:"@react-three/fiber",rendererVersion:"9.4.2"}),ew=new Map,ex={objects:"shallow",strict:!1};function eE(e){let t,n,r=ew.get(e),i=null==r?void 0:r.fiber,o=null==r?void 0:r.store;r&&console.warn("R3F.createRoot should only be called once!");let a="function"==typeof reportError?reportError:console.error,s=o||((e,t)=>{let n,r,i=(n=(n,r)=>{let i,o=new d.Pq0,a=new d.Pq0,s=new d.Pq0;function c(e=r().camera,t=a,n=r().size){let{width:i,height:l,top:u,left:d}=n,f=i/l;t.isVector3?s.copy(t):s.set(...t);let p=e.getWorldPosition(o).distanceTo(s);if(e&&e.isOrthographicCamera)return{width:i/e.zoom,height:l/e.zoom,top:u,left:d,factor:1,distance:p,aspect:f};{let t=2*Math.tan(e.fov*Math.PI/180/2)*p,n=i/l*t;return{width:n,height:t,top:u,left:d,factor:i/n,distance:p,aspect:f}}}let u=e=>n(t=>({performance:{...t.performance,current:e}})),f=new d.I9Y;return{set:n,get:r,gl:null,camera:null,raycaster:null,events:{priority:1,enabled:!0,connected:!1},scene:null,xr:null,invalidate:(t=1)=>e(r(),t),advance:(e,n)=>t(e,n,r()),legacy:!1,linear:!1,flat:!1,controls:null,clock:new d.zD7,pointer:f,mouse:f,frameloop:"always",onPointerMissed:void 0,performance:{current:1,min:.5,max:1,debounce:200,regress:()=>{let e=r();i&&clearTimeout(i),e.performance.current!==e.performance.min&&u(e.performance.min),i=setTimeout(()=>u(r().performance.max),e.performance.debounce)}},size:{width:0,height:0,top:0,left:0},viewport:{initialDpr:0,dpr:0,width:0,height:0,top:0,left:0,aspect:0,distance:0,factor:0,getCurrentViewport:c},setEvents:e=>n(t=>({...t,events:{...t.events,...e}})),setSize:(e,t,i=0,o=0)=>{let s=r().camera,l={width:e,height:t,top:i,left:o};n(e=>({size:l,viewport:{...e.viewport,...c(s,a,l)}}))},setDpr:e=>n(t=>{let n=T(e);return{viewport:{...t.viewport,dpr:n,initialDpr:t.viewport.initialDpr||n}}}),setFrameloop:(e="always")=>{let t=r().clock;t.stop(),t.elapsedTime=0,"never"!==e&&(t.start(),t.elapsedTime=0),n(()=>({frameloop:e}))},previousRoot:void 0,internal:{interaction:[],hovered:new Map,subscribers:[],initialClick:[0,0],initialHits:[],capturedMap:new Map,lastEvent:l.createRef(),active:!1,frames:0,priority:0,subscribe:(e,t,n)=>{let i=r().internal;return i.priority=i.priority+ +(t>0),i.subscribers.push({ref:e,priority:t,store:n}),i.subscribers=i.subscribers.sort((e,t)=>e.priority-t.priority),()=>{let n=r().internal;null!=n&&n.subscribers&&(n.priority=n.priority-(t>0),n.subscribers=n.subscribers.filter(t=>t.ref!==e))}}}}})?m(n,r):m,o=i.getState(),a=o.size,s=o.viewport.dpr,c=o.camera;return i.subscribe(()=>{let{camera:e,size:t,viewport:n,gl:r,set:o}=i.getState();if(t.width!==a.width||t.height!==a.height||n.dpr!==s){a=t,s=n.dpr,function(e,t){!e.manual&&(e&&e.isOrthographicCamera?(e.left=-(t.width/2),e.right=t.width/2,e.top=t.height/2,e.bottom=-(t.height/2)):e.aspect=t.width/t.height,e.updateProjectionMatrix())}(e,t),n.dpr>0&&r.setPixelRatio(n.dpr);let i="undefined"!=typeof HTMLCanvasElement&&r.domElement instanceof HTMLCanvasElement;r.setSize(t.width,t.height,i)}e!==c&&(c=e,o(t=>({viewport:{...t.viewport,...t.viewport.getCurrentViewport(e)}})))}),i.subscribe(t=>e(t)),i})(eR,ek),c=i||ey.createContainer(s,u.ConcurrentRoot,null,!1,null,"",a,a,a,null);r||ew.set(e,{fiber:c,store:s});let p=!1,h=null;return{async configure(r={}){var i,o;let a;h=new Promise(e=>a=e);let{gl:l,size:c,scene:u,events:v,onCreated:m,shadows:g=!1,linear:b=!1,flat:y=!1,legacy:w=!1,orthographic:x=!1,frameloop:E="always",dpr:_=[1,2],performance:S,raycaster:M,camera:O,onPointerMissed:j}=r,A=s.getState(),C=A.gl;if(!A.gl){let t={canvas:e,powerPreference:"high-performance",antialias:!0,alpha:!0},n="function"==typeof l?await l(t):l;C=V(n)?n:new f.WebGLRenderer({...t,...l}),A.set({gl:C})}let P=A.raycaster;P||A.set({raycaster:P=new d.tBo});let{params:L,...R}=M||{};if(D.equ(R,P,ex)||Y(P,{...R}),D.equ(L,P.params,ex)||Y(P,{params:{...P.params,...L}}),!A.camera||A.camera===n&&!D.equ(n,O,ex)){n=O;let e=null==O?void 0:O.isCamera,t=e?O:x?new d.qUd(0,0,0,0,.1,1e3):new d.ubm(75,0,.1,1e3);!e&&(t.position.z=5,O&&(Y(t,O),!t.manual&&("aspect"in O||"left"in O||"right"in O||"bottom"in O||"top"in O)&&(t.manual=!0,t.updateProjectionMatrix())),A.camera||null!=O&&O.rotation||t.lookAt(0,0,0)),A.set({camera:t}),P.camera=t}if(!A.scene){let e;null!=u&&u.isScene?k(e=u,s,"",{}):(k(e=new d.Z58,s,"",{}),u&&Y(e,u)),A.set({scene:e})}v&&!A.events.handlers&&A.set({events:v(s)});let I=function(e,t){if(!t&&"undefined"!=typeof HTMLCanvasElement&&e instanceof HTMLCanvasElement&&e.parentElement){let{width:t,height:n,top:r,left:i}=e.parentElement.getBoundingClientRect();return{width:t,height:n,top:r,left:i}}return!t&&"undefined"!=typeof OffscreenCanvas&&e instanceof OffscreenCanvas?{width:e.width,height:e.height,top:0,left:0}:{width:0,height:0,top:0,left:0,...t}}(e,c);if(D.equ(I,A.size,ex)||A.setSize(I.width,I.height,I.top,I.left),_&&A.viewport.dpr!==T(_)&&A.setDpr(_),A.frameloop!==E&&A.setFrameloop(E),A.onPointerMissed||A.set({onPointerMissed:j}),S&&!D.equ(S,A.performance,ex)&&A.set(e=>({performance:{...e.performance,...S}})),!A.xr){let e=(e,t)=>{let n=s.getState();"never"!==n.frameloop&&ek(e,!0,n,t)},t=()=>{let t=s.getState();t.gl.xr.enabled=t.gl.xr.isPresenting,t.gl.xr.setAnimationLoop(t.gl.xr.isPresenting?e:null),t.gl.xr.isPresenting||eR(t)},n={connect(){let e=s.getState().gl;e.xr.addEventListener("sessionstart",t),e.xr.addEventListener("sessionend",t)},disconnect(){let e=s.getState().gl;e.xr.removeEventListener("sessionstart",t),e.xr.removeEventListener("sessionend",t)}};"function"==typeof(null==(i=C.xr)?void 0:i.addEventListener)&&n.connect(),A.set({xr:n})}if(C.shadowMap){let e=C.shadowMap.enabled,t=C.shadowMap.type;if(C.shadowMap.enabled=!!g,D.boo(g))C.shadowMap.type=d.Wk7;else if(D.str(g)){let e={basic:d.bTm,percentage:d.QP0,soft:d.Wk7,variance:d.RyA};C.shadowMap.type=null!=(o=e[g])?o:d.Wk7}else D.obj(g)&&Object.assign(C.shadowMap,g);(e!==C.shadowMap.enabled||t!==C.shadowMap.type)&&(C.shadowMap.needsUpdate=!0)}return d.ppV.enabled=!w,p||(C.outputColorSpace=b?d.Zr2:d.er$,C.toneMapping=y?d.y_p:d.FV),A.legacy!==w&&A.set(()=>({legacy:w})),A.linear!==b&&A.set(()=>({linear:b})),A.flat!==y&&A.set(()=>({flat:y})),!l||D.fun(l)||V(l)||D.equ(l,C,ex)||Y(C,l),t=m,p=!0,a(),this},render(n){return p||h||this.configure(),h.then(()=>{ey.updateContainer((0,x.jsx)(e_,{store:s,children:n,onCreated:t,rootElement:e}),c,null,()=>void 0)}),s},unmount(){eS(e)}}}function e_({store:e,children:t,onCreated:n,rootElement:r}){return O(()=>{let t=e.getState();t.set(e=>({internal:{...e.internal,active:!0}})),n&&n(t),e.getState().events.connected||null==t.events.connect||t.events.connect(r)},[]),(0,x.jsx)($.Provider,{value:e,children:t})}function eS(e,t){let n=ew.get(e),r=null==n?void 0:n.fiber;if(r){let i=null==n?void 0:n.store.getState();i&&(i.internal.active=!1),ey.updateContainer(null,r,null,()=>{i&&setTimeout(()=>{try{null==i.events.disconnect||i.events.disconnect(),null==(n=i.gl)||null==(r=n.renderLists)||null==r.dispose||r.dispose(),null==(o=i.gl)||null==o.forceContextLoss||o.forceContextLoss(),null!=(a=i.gl)&&a.xr&&i.xr.disconnect();var n,r,o,a,s=i.scene;for(let e in"Scene"!==s.type&&(null==s.dispose||s.dispose()),s){let t=s[e];(null==t?void 0:t.type)!=="Scene"&&(null==t||null==t.dispose||t.dispose())}ew.delete(e),t&&t(e)}catch(e){}},500)})}}let eM=new Set,eO=new Set,ej=new Set;function eA(e,t){if(e.size)for(let{callback:n}of e.values())n(t)}function eC(e,t){switch(e){case"before":return eA(eM,t);case"after":return eA(eO,t);case"tail":return eA(ej,t)}}function eP(e,t,n){let o=t.clock.getDelta();"never"===t.frameloop&&"number"==typeof e&&(o=e-t.clock.elapsedTime,t.clock.oldTime=t.clock.elapsedTime,t.clock.elapsedTime=e),r=t.internal.subscribers;for(let e=0;e<r.length;e++)(i=r[e]).ref.current(i.store.getState(),o,n);return!t.internal.priority&&t.gl.render&&t.gl.render(t.scene,t.camera),t.internal.frames=Math.max(0,t.internal.frames-1),"always"===t.frameloop?1:t.internal.frames}let eT=!1,eL=!1;function eD(e){for(let n of(a=requestAnimationFrame(eD),eT=!0,o=0,eC("before",e),eL=!0,ew.values())){var t;(s=n.store.getState()).internal.active&&("always"===s.frameloop||s.internal.frames>0)&&!(null!=(t=s.gl.xr)&&t.isPresenting)&&(o+=eP(e,s))}if(eL=!1,eC("after",e),0===o)return eC("tail",e),eT=!1,cancelAnimationFrame(a)}function eR(e,t=1){var n;if(!e)return ew.forEach(e=>eR(e.store.getState(),t));(null==(n=e.gl.xr)||!n.isPresenting)&&e.internal.active&&"never"!==e.frameloop&&(t>1?e.internal.frames=Math.min(60,e.internal.frames+t):eL?e.internal.frames=2:e.internal.frames=1,eT||(eT=!0,requestAnimationFrame(eD)))}function ek(e,t=!0,n,r){if(t&&eC("before",e),n)eP(e,n,r);else for(let t of ew.values())eP(e,t.store.getState());t&&eC("after",e)}let eI={onClick:["click",!1],onContextMenu:["contextmenu",!1],onDoubleClick:["dblclick",!1],onWheel:["wheel",!0],onPointerDown:["pointerdown",!0],onPointerUp:["pointerup",!0],onPointerLeave:["pointerleave",!0],onPointerMove:["pointermove",!0],onPointerCancel:["pointercancel",!0],onLostPointerCapture:["lostpointercapture",!0]};function ez(e){let{handlePointer:t}=function(e){function t(e){return e.filter(e=>["Move","Over","Enter","Out","Leave"].some(t=>{var n;return null==(n=e.__r3f)?void 0:n.handlers["onPointer"+t]}))}function n(t){let{internal:n}=e.getState();for(let e of n.hovered.values())if(!t.length||!t.find(t=>t.object===e.object&&t.index===e.index&&t.instanceId===e.instanceId)){let r=e.eventObject.__r3f;if(n.hovered.delete(X(e)),null!=r&&r.eventCount){let n=r.handlers,i={...e,intersections:t};null==n.onPointerOut||n.onPointerOut(i),null==n.onPointerLeave||n.onPointerLeave(i)}}}function r(e,t){for(let n=0;n<t.length;n++){let r=t[n].__r3f;null==r||null==r.handlers.onPointerMissed||r.handlers.onPointerMissed(e)}}return{handlePointer:function(i){switch(i){case"onPointerLeave":case"onPointerCancel":return()=>n([]);case"onLostPointerCapture":return t=>{let{internal:r}=e.getState();"pointerId"in t&&r.capturedMap.has(t.pointerId)&&requestAnimationFrame(()=>{r.capturedMap.has(t.pointerId)&&(r.capturedMap.delete(t.pointerId),n([]))})}}return function(o){let{onPointerMissed:a,internal:s}=e.getState();s.lastEvent.current=o;let l="onPointerMove"===i,c="onClick"===i||"onContextMenu"===i||"onDoubleClick"===i,u=function(t,n){let r=e.getState(),i=new Set,o=[],a=n?n(r.internal.interaction):r.internal.interaction;for(let e=0;e<a.length;e++){let t=L(a[e]);t&&(t.raycaster.camera=void 0)}r.previousRoot||null==r.events.compute||r.events.compute(t,r);let s=a.flatMap(function(e){let n=L(e);if(!n||!n.events.enabled||null===n.raycaster.camera)return[];if(void 0===n.raycaster.camera){var r;null==n.events.compute||n.events.compute(t,n,null==(r=n.previousRoot)?void 0:r.getState()),void 0===n.raycaster.camera&&(n.raycaster.camera=null)}return n.raycaster.camera?n.raycaster.intersectObject(e,!0):[]}).sort((e,t)=>{let n=L(e.object),r=L(t.object);return n&&r&&r.events.priority-n.events.priority||e.distance-t.distance}).filter(e=>{let t=X(e);return!i.has(t)&&(i.add(t),!0)});for(let e of(r.events.filter&&(s=r.events.filter(s,r)),s)){let t=e.object;for(;t;){var l;null!=(l=t.__r3f)&&l.eventCount&&o.push({...e,eventObject:t}),t=t.parent}}if("pointerId"in t&&r.internal.capturedMap.has(t.pointerId))for(let e of r.internal.capturedMap.get(t.pointerId).values())i.has(X(e.intersection))||o.push(e.intersection);return o}(o,l?t:void 0),f=c?function(t){let{internal:n}=e.getState(),r=t.offsetX-n.initialClick[0],i=t.offsetY-n.initialClick[1];return Math.round(Math.sqrt(r*r+i*i))}(o):0;"onPointerDown"===i&&(s.initialClick=[o.offsetX,o.offsetY],s.initialHits=u.map(e=>e.eventObject)),c&&!u.length&&f<=2&&(r(o,s.interaction),a&&a(o)),l&&n(u),!function(e,t,r,i){if(e.length){let o={stopped:!1};for(let a of e){let s=L(a.object);if(s||a.object.traverseAncestors(e=>{let t=L(e);if(t)return s=t,!1}),s){let{raycaster:l,pointer:c,camera:u,internal:f}=s,p=new d.Pq0(c.x,c.y,0).unproject(u),h=e=>{var t,n;return null!=(t=null==(n=f.capturedMap.get(e))?void 0:n.has(a.eventObject))&&t},v=e=>{let n={intersection:a,target:t.target};f.capturedMap.has(e)?f.capturedMap.get(e).set(a.eventObject,n):f.capturedMap.set(e,new Map([[a.eventObject,n]])),t.target.setPointerCapture(e)},m=e=>{let t=f.capturedMap.get(e);t&&K(f.capturedMap,a.eventObject,t,e)},g={};for(let e in t){let n=t[e];"function"!=typeof n&&(g[e]=n)}let b={...a,...g,pointer:c,intersections:e,stopped:o.stopped,delta:r,unprojectedPoint:p,ray:l.ray,camera:u,stopPropagation(){let r="pointerId"in t&&f.capturedMap.get(t.pointerId);(!r||r.has(a.eventObject))&&(b.stopped=o.stopped=!0,f.hovered.size&&Array.from(f.hovered.values()).find(e=>e.eventObject===a.eventObject)&&n([...e.slice(0,e.indexOf(a)),a]))},target:{hasPointerCapture:h,setPointerCapture:v,releasePointerCapture:m},currentTarget:{hasPointerCapture:h,setPointerCapture:v,releasePointerCapture:m},nativeEvent:t};if(i(b),!0===o.stopped)break}}}}(u,o,f,function(e){let t=e.eventObject,n=t.__r3f;if(!(null!=n&&n.eventCount))return;let a=n.handlers;if(l){if(a.onPointerOver||a.onPointerEnter||a.onPointerOut||a.onPointerLeave){let t=X(e),n=s.hovered.get(t);n?n.stopped&&e.stopPropagation():(s.hovered.set(t,e),null==a.onPointerOver||a.onPointerOver(e),null==a.onPointerEnter||a.onPointerEnter(e))}null==a.onPointerMove||a.onPointerMove(e)}else{let n=a[i];n?(!c||s.initialHits.includes(t))&&(r(o,s.interaction.filter(e=>!s.initialHits.includes(e))),n(e)):c&&s.initialHits.includes(t)&&r(o,s.interaction.filter(e=>!s.initialHits.includes(e)))}})}}}}(e);return{priority:1,enabled:!0,compute(e,t,n){t.pointer.set(e.offsetX/t.size.width*2-1,-(2*(e.offsetY/t.size.height))+1),t.raycaster.setFromCamera(t.pointer,t.camera)},connected:void 0,handlers:Object.keys(eI).reduce((e,n)=>({...e,[n]:t(n)}),{}),update:()=>{var t;let{events:n,internal:r}=e.getState();null!=(t=r.lastEvent)&&t.current&&n.handlers&&n.handlers.onPointerMove(r.lastEvent.current)},connect:t=>{let{set:n,events:r}=e.getState();if(null==r.disconnect||r.disconnect(),n(e=>({events:{...e.events,connected:t}})),r.handlers)for(let e in r.handlers){let n=r.handlers[e],[i,o]=eI[e];t.addEventListener(i,n,{passive:o})}},disconnect:()=>{let{set:t,events:n}=e.getState();if(n.connected){if(n.handlers)for(let e in n.handlers){let t=n.handlers[e],[r]=eI[e];n.connected.removeEventListener(r,t)}t(e=>({events:{...e.events,connected:void 0}}))}}}}},3666:(e,t,n)=>{n.d(t,{n:()=>a});var r=n(2331);let i=new r.NRn,o=new r.Pq0;class a extends r.CmU{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new r.qtW([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new r.qtW([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new r.LuO(t,6,1);return this.setAttribute("instanceStart",new r.eHs(n,3,0)),this.setAttribute("instanceEnd",new r.eHs(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new r.LuO(t,6,1);return this.setAttribute("instanceColorStart",new r.eHs(n,3,0)),this.setAttribute("instanceColorEnd",new r.eHs(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new r.XJ7(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new r.NRn);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),i.setFromBufferAttribute(t),this.boundingBox.union(i))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new r.iyt),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)o.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(o)),o.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(o));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}}},4044:(e,t,n)=>{let r,i;n.d(t,{b:()=>_});var o=n(2331),a=n(3666),s=n(7964);s.UniformsLib.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new o.I9Y(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}},s.ShaderLib.line={uniforms:o.LlO.merge([s.UniformsLib.common,s.UniformsLib.fog,s.UniformsLib.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			float alpha = opacity;

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};class l extends o.BKk{constructor(e){super({type:"LineMaterial",uniforms:o.LlO.clone(s.ShaderLib.line.uniforms),vertexShader:s.ShaderLib.line.vertexShader,fragmentShader:s.ShaderLib.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){!0===e!==this.dashed&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(!0===e!==this.alphaToCoverage&&(this.needsUpdate=!0),!0===e?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}}let c=new o.IUQ,u=new o.Pq0,d=new o.Pq0,f=new o.IUQ,p=new o.IUQ,h=new o.IUQ,v=new o.Pq0,m=new o.kn4,g=new o.cZY,b=new o.Pq0,y=new o.NRn,w=new o.iyt,x=new o.IUQ;function E(e,t,n){return x.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),x.multiplyScalar(1/x.w),x.x=i/n.width,x.y=i/n.height,x.applyMatrix4(e.projectionMatrixInverse),x.multiplyScalar(1/x.w),Math.abs(Math.max(x.x,x.y))}class _ extends o.eaF{constructor(e=new a.n,t=new l({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,o=t.count;e<o;e++,i+=2)u.fromBufferAttribute(t,e),d.fromBufferAttribute(n,e),r[i]=0===i?0:r[i-1],r[i+1]=r[i]+u.distanceTo(d);let i=new o.LuO(r,2,1);return e.setAttribute("instanceDistanceStart",new o.eHs(i,1,0)),e.setAttribute("instanceDistanceEnd",new o.eHs(i,1,1)),this}raycast(e,t){let n,a,s=this.material.worldUnits,l=e.camera;null!==l||s||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let c=void 0!==e.params.Line2&&e.params.Line2.threshold||0;r=e.ray;let u=this.matrixWorld,d=this.geometry,x=this.material;if(i=x.linewidth+c,null===d.boundingSphere&&d.computeBoundingSphere(),w.copy(d.boundingSphere).applyMatrix4(u),s)n=.5*i;else{let e=Math.max(l.near,w.distanceToPoint(r.origin));n=E(l,e,x.resolution)}if(w.radius+=n,!1!==r.intersectsSphere(w)){if(null===d.boundingBox&&d.computeBoundingBox(),y.copy(d.boundingBox).applyMatrix4(u),s)a=.5*i;else{let e=Math.max(l.near,y.distanceToPoint(r.origin));a=E(l,e,x.resolution)}y.expandByScalar(a),!1!==r.intersectsBox(y)&&(s?function(e,t){let n=e.matrixWorld,a=e.geometry,s=a.attributes.instanceStart,l=a.attributes.instanceEnd,c=Math.min(a.instanceCount,s.count);for(let a=0;a<c;a++){g.start.fromBufferAttribute(s,a),g.end.fromBufferAttribute(l,a),g.applyMatrix4(n);let c=new o.Pq0,u=new o.Pq0;r.distanceSqToSegment(g.start,g.end,u,c),u.distanceTo(c)<.5*i&&t.push({point:u,pointOnLine:c,distance:r.origin.distanceTo(u),object:e,face:null,faceIndex:a,uv:null,uv1:null})}}(this,t):function(e,t,n){let a=t.projectionMatrix,s=e.material.resolution,l=e.matrixWorld,c=e.geometry,u=c.attributes.instanceStart,d=c.attributes.instanceEnd,y=Math.min(c.instanceCount,u.count),w=-t.near;r.at(1,h),h.w=1,h.applyMatrix4(t.matrixWorldInverse),h.applyMatrix4(a),h.multiplyScalar(1/h.w),h.x*=s.x/2,h.y*=s.y/2,h.z=0,v.copy(h),m.multiplyMatrices(t.matrixWorldInverse,l);for(let t=0;t<y;t++){if(f.fromBufferAttribute(u,t),p.fromBufferAttribute(d,t),f.w=1,p.w=1,f.applyMatrix4(m),p.applyMatrix4(m),f.z>w&&p.z>w)continue;if(f.z>w){let e=f.z-p.z,t=(f.z-w)/e;f.lerp(p,t)}else if(p.z>w){let e=p.z-f.z,t=(p.z-w)/e;p.lerp(f,t)}f.applyMatrix4(a),p.applyMatrix4(a),f.multiplyScalar(1/f.w),p.multiplyScalar(1/p.w),f.x*=s.x/2,f.y*=s.y/2,p.x*=s.x/2,p.y*=s.y/2,g.start.copy(f),g.start.z=0,g.end.copy(p),g.end.z=0;let c=g.closestPointToPointParameter(v,!0);g.at(c,b);let h=o.cj9.lerp(f.z,p.z,c),y=h>=-1&&h<=1,x=v.distanceTo(b)<.5*i;if(y&&x){g.start.fromBufferAttribute(u,t),g.end.fromBufferAttribute(d,t),g.start.applyMatrix4(l),g.end.applyMatrix4(l);let i=new o.Pq0,a=new o.Pq0;r.distanceSqToSegment(g.start,g.end,a,i),n.push({point:a,pointOnLine:i,distance:r.origin.distanceTo(a),object:e,face:null,faceIndex:t,uv:null,uv1:null})}}}(this,l,t))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(c),this.material.uniforms.resolution.value.set(c.z,c.w))}}},4086:(e,t,n)=>{var r=n(4364),i=n(2070),o="function"==typeof Object.is?Object.is:function(e,t){return e===t&&(0!==e||1/e==1/t)||e!=e&&t!=t},a=i.useSyncExternalStore,s=r.useRef,l=r.useEffect,c=r.useMemo,u=r.useDebugValue;t.useSyncExternalStoreWithSelector=function(e,t,n,r,i){var d=s(null);if(null===d.current){var f={hasValue:!1,value:null};d.current=f}else f=d.current;var p=a(e,(d=c(function(){function e(e){if(!l){if(l=!0,a=e,e=r(e),void 0!==i&&f.hasValue){var t=f.value;if(i(t,e))return s=t}return s=e}if(t=s,o(a,e))return t;var n=r(e);return void 0!==i&&i(t,n)?(a=e,t):(a=e,s=n)}var a,s,l=!1,c=void 0===n?null:n;return[function(){return e(t())},null===c?void 0:function(){return e(c())}]},[t,n,r,i]))[0],d[1]);return l(function(){f.hasValue=!0,f.value=p},[p]),u(p),p}},4644:(e,t,n)=>{e.exports=n(8541)},4762:(e,t,n)=>{e.exports=n(7235)},4893:(e,t,n)=>{function r(){var e=Object.create(null);function t(e,t){var n=void 0;self.troikaDefine=function(e){return n=e};var r=URL.createObjectURL(new Blob(["/** "+e.replace(/\*/g,"")+" **/\n\ntroikaDefine(\n"+t+"\n)"],{type:"application/javascript"}));try{importScripts(r)}catch(e){console.error(e)}return URL.revokeObjectURL(r),delete self.troikaDefine,n}self.addEventListener("message",function(n){var r=n.data,i=r.messageId,o=r.action,a=r.data;try{"registerModule"===o&&function n(r,i){var o=r.id,a=r.name,s=r.dependencies;void 0===s&&(s=[]);var l=r.init;void 0===l&&(l=function(){});var c=r.getTransferables;if(void 0===c&&(c=null),!e[o])try{s=s.map(function(t){return t&&t.isWorkerModule&&(n(t,function(e){if(e instanceof Error)throw e}),t=e[t.id].value),t}),l=t("<"+a+">.init",l),c&&(c=t("<"+a+">.getTransferables",c));var u=null;"function"==typeof l?u=l.apply(void 0,s):console.error("worker module init function failed to rehydrate"),e[o]={id:o,value:u,getTransferables:c},i(u)}catch(e){e&&e.noLog||console.error(e),i(e)}}(a,function(e){e instanceof Error?postMessage({messageId:i,success:!1,error:e.message}):postMessage({messageId:i,success:!0,result:{isCallable:"function"==typeof e}})}),"callModule"===o&&function(t,n){var r,i=t.id,o=t.args;e[i]&&"function"==typeof e[i].value||n(Error("Worker module "+i+": not found or its 'init' did not return a function"));try{var a=(r=e[i]).value.apply(r,o);a&&"function"==typeof a.then?a.then(s,function(e){return n(e instanceof Error?e:Error(""+e))}):s(a)}catch(e){n(e)}function s(t){try{var r=e[i].getTransferables&&e[i].getTransferables(t);r&&Array.isArray(r)&&r.length||(r=void 0),n(t,r)}catch(e){console.error(e),n(e)}}}(a,function(e,t){e instanceof Error?postMessage({messageId:i,success:!1,error:e.message}):postMessage({messageId:i,success:!0,result:e},t||void 0)})}catch(e){postMessage({messageId:i,success:!1,error:e.stack})}})}n.d(t,{Qw:()=>d,kl:()=>function e(t){if((!t||"function"!=typeof t.init)&&!s)throw Error("requires `options.init` function");var n,r=t.dependencies,a=t.init,l=t.getTransferables,u=t.workerId,d=((n=function(){for(var e=[],t=arguments.length;t--;)e[t]=arguments[t];return n._getInitResult().then(function(t){if("function"==typeof t)return t.apply(void 0,e);throw Error("Worker module function was called but `init` did not return a callable function")})})._getInitResult=function(){var e=t.dependencies,r=t.init,i=Promise.all(e=Array.isArray(e)?e.map(function(e){return e&&(e=e.onMainThread||e)._getInitResult&&(e=e._getInitResult()),e}):[]).then(function(e){return r.apply(null,e)});return n._getInitResult=function(){return i},i},n);null==u&&(u="#default");var h="workerModule"+ ++o,v=t.name||h,m=null;function g(){for(var e=[],t=arguments.length;t--;)e[t]=arguments[t];if(!i())return d.apply(void 0,e);if(!m){m=p(u,"registerModule",g.workerModuleData);var n=function(){m=null,c[u].delete(n)};(c[u]||(c[u]=new Set)).add(n)}return m.then(function(t){if(t.isCallable)return p(u,"callModule",{id:h,args:e});throw Error("Worker module function was called but `init` did not return a callable function")})}return r=r&&r.map(function(t){return"function"!=typeof t||t.workerModuleData||(s=!0,t=e({workerId:u,name:"<"+v+"> function dependency: "+t.name,init:"function(){return (\n"+f(t)+"\n)}"}),s=!1),t&&t.workerModuleData&&(t=t.workerModuleData),t}),g.workerModuleData={isWorkerModule:!0,id:h,name:v,dependencies:r,init:f(a),getTransferables:l&&f(l)},g.onMainThread=d,g}}),n(7023);var i=function(){var e=!1;if("undefined"!=typeof window&&void 0!==window.document)try{new Worker(URL.createObjectURL(new Blob([""],{type:"application/javascript"}))).terminate(),e=!0}catch(e){console.log("Troika createWorkerModule: web workers not allowed; falling back to main thread execution. Cause: ["+e.message+"]")}return i=function(){return e},e},o=0,a=0,s=!1,l=Object.create(null),c=Object.create(null),u=Object.create(null);function d(e){c[e]&&c[e].forEach(function(e){e()}),l[e]&&(l[e].terminate(),delete l[e])}function f(e){var t=e.toString();return!/^function/.test(t)&&/^\w+\s*\(/.test(t)&&(t="function "+t),t}function p(e,t,n){return new Promise(function(i,o){var s=++a;u[s]=function(e){e.success?i(e.result):o(Error("Error in worker "+t+" call: "+e.error))},(function(e){var t=l[e];if(!t){var n=f(r);(t=l[e]=new Worker(URL.createObjectURL(new Blob(["/** Worker Module Bootstrap: "+e.replace(/\*/g,"")+" **/\n\n;("+n+")()"],{type:"application/javascript"})))).onmessage=function(e){var t=e.data,n=t.messageId,r=u[n];if(!r)throw Error("WorkerModule response with empty or unknown messageId");delete u[n],r(t)}}return t})(e).postMessage({messageId:s,action:t,data:n})})}},5528:(e,t,n)=>{n.d(t,{N:()=>m});var r=n(2396),i=n(3353),o=n(4364),a=n(2331),s=Object.defineProperty;class l{constructor(){((e,t,n)=>((e,t,n)=>t in e?s(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n)(e,"symbol"!=typeof t?t+"":t,n))(this,"_listeners")}addEventListener(e,t){void 0===this._listeners&&(this._listeners={});let n=this._listeners;void 0===n[e]&&(n[e]=[]),-1===n[e].indexOf(t)&&n[e].push(t)}hasEventListener(e,t){if(void 0===this._listeners)return!1;let n=this._listeners;return void 0!==n[e]&&-1!==n[e].indexOf(t)}removeEventListener(e,t){if(void 0===this._listeners)return;let n=this._listeners[e];if(void 0!==n){let e=n.indexOf(t);-1!==e&&n.splice(e,1)}}dispatchEvent(e){if(void 0===this._listeners)return;let t=this._listeners[e.type];if(void 0!==t){e.target=this;let n=t.slice(0);for(let t=0,r=n.length;t<r;t++)n[t].call(this,e);e.target=null}}}var c=Object.defineProperty,u=(e,t,n)=>(((e,t,n)=>t in e?c(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n)(e,"symbol"!=typeof t?t+"":t,n),n);let d=new a.RlV,f=new a.Zcv,p=Math.cos(Math.PI/180*70),h=(e,t)=>(e%t+t)%t;class v extends l{constructor(e,t){super(),u(this,"object"),u(this,"domElement"),u(this,"enabled",!0),u(this,"target",new a.Pq0),u(this,"minDistance",0),u(this,"maxDistance",1/0),u(this,"minZoom",0),u(this,"maxZoom",1/0),u(this,"minPolarAngle",0),u(this,"maxPolarAngle",Math.PI),u(this,"minAzimuthAngle",-1/0),u(this,"maxAzimuthAngle",1/0),u(this,"enableDamping",!1),u(this,"dampingFactor",.05),u(this,"enableZoom",!0),u(this,"zoomSpeed",1),u(this,"enableRotate",!0),u(this,"rotateSpeed",1),u(this,"enablePan",!0),u(this,"panSpeed",1),u(this,"screenSpacePanning",!0),u(this,"keyPanSpeed",7),u(this,"zoomToCursor",!1),u(this,"autoRotate",!1),u(this,"autoRotateSpeed",2),u(this,"reverseOrbit",!1),u(this,"reverseHorizontalOrbit",!1),u(this,"reverseVerticalOrbit",!1),u(this,"keys",{LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"}),u(this,"mouseButtons",{LEFT:a.kBv.ROTATE,MIDDLE:a.kBv.DOLLY,RIGHT:a.kBv.PAN}),u(this,"touches",{ONE:a.wtR.ROTATE,TWO:a.wtR.DOLLY_PAN}),u(this,"target0"),u(this,"position0"),u(this,"zoom0"),u(this,"_domElementKeyEvents",null),u(this,"getPolarAngle"),u(this,"getAzimuthalAngle"),u(this,"setPolarAngle"),u(this,"setAzimuthalAngle"),u(this,"getDistance"),u(this,"getZoomScale"),u(this,"listenToKeyEvents"),u(this,"stopListenToKeyEvents"),u(this,"saveState"),u(this,"reset"),u(this,"update"),u(this,"connect"),u(this,"dispose"),u(this,"dollyIn"),u(this,"dollyOut"),u(this,"getScale"),u(this,"setScale"),this.object=e,this.domElement=t,this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this.getPolarAngle=()=>v.phi,this.getAzimuthalAngle=()=>v.theta,this.setPolarAngle=e=>{let t=h(e,2*Math.PI),r=v.phi;r<0&&(r+=2*Math.PI),t<0&&(t+=2*Math.PI);let i=Math.abs(t-r);2*Math.PI-i<i&&(t<r?t+=2*Math.PI:r+=2*Math.PI),m.phi=t-r,n.update()},this.setAzimuthalAngle=e=>{let t=h(e,2*Math.PI),r=v.theta;r<0&&(r+=2*Math.PI),t<0&&(t+=2*Math.PI);let i=Math.abs(t-r);2*Math.PI-i<i&&(t<r?t+=2*Math.PI:r+=2*Math.PI),m.theta=t-r,n.update()},this.getDistance=()=>n.object.position.distanceTo(n.target),this.listenToKeyEvents=e=>{e.addEventListener("keydown",ee),this._domElementKeyEvents=e},this.stopListenToKeyEvents=()=>{this._domElementKeyEvents.removeEventListener("keydown",ee),this._domElementKeyEvents=null},this.saveState=()=>{n.target0.copy(n.target),n.position0.copy(n.object.position),n.zoom0=n.object.zoom},this.reset=()=>{n.target.copy(n.target0),n.object.position.copy(n.position0),n.object.zoom=n.zoom0,n.object.updateProjectionMatrix(),n.dispatchEvent(r),n.update(),l=s.NONE},this.update=(()=>{let t=new a.Pq0,i=new a.Pq0(0,1,0),o=new a.PTz().setFromUnitVectors(e.up,i),u=o.clone().invert(),h=new a.Pq0,y=new a.PTz,w=2*Math.PI;return function(){let x=n.object.position;o.setFromUnitVectors(e.up,i),u.copy(o).invert(),t.copy(x).sub(n.target),t.applyQuaternion(o),v.setFromVector3(t),n.autoRotate&&l===s.NONE&&R(2*Math.PI/60/60*n.autoRotateSpeed),n.enableDamping?(v.theta+=m.theta*n.dampingFactor,v.phi+=m.phi*n.dampingFactor):(v.theta+=m.theta,v.phi+=m.phi);let E=n.minAzimuthAngle,_=n.maxAzimuthAngle;isFinite(E)&&isFinite(_)&&(E<-Math.PI?E+=w:E>Math.PI&&(E-=w),_<-Math.PI?_+=w:_>Math.PI&&(_-=w),E<=_?v.theta=Math.max(E,Math.min(_,v.theta)):v.theta=v.theta>(E+_)/2?Math.max(E,v.theta):Math.min(_,v.theta)),v.phi=Math.max(n.minPolarAngle,Math.min(n.maxPolarAngle,v.phi)),v.makeSafe(),!0===n.enableDamping?n.target.addScaledVector(b,n.dampingFactor):n.target.add(b),n.zoomToCursor&&P||n.object.isOrthographicCamera?v.radius=B(v.radius):v.radius=B(v.radius*g),t.setFromSpherical(v),t.applyQuaternion(u),x.copy(n.target).add(t),n.object.matrixAutoUpdate||n.object.updateMatrix(),n.object.lookAt(n.target),!0===n.enableDamping?(m.theta*=1-n.dampingFactor,m.phi*=1-n.dampingFactor,b.multiplyScalar(1-n.dampingFactor)):(m.set(0,0,0),b.set(0,0,0));let S=!1;if(n.zoomToCursor&&P){let r=null;if(n.object instanceof a.ubm&&n.object.isPerspectiveCamera){let e=t.length();r=B(e*g);let i=e-r;n.object.position.addScaledVector(A,i),n.object.updateMatrixWorld()}else if(n.object.isOrthographicCamera){let e=new a.Pq0(C.x,C.y,0);e.unproject(n.object),n.object.zoom=Math.max(n.minZoom,Math.min(n.maxZoom,n.object.zoom/g)),n.object.updateProjectionMatrix(),S=!0;let i=new a.Pq0(C.x,C.y,0);i.unproject(n.object),n.object.position.sub(i).add(e),n.object.updateMatrixWorld(),r=t.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),n.zoomToCursor=!1;null!==r&&(n.screenSpacePanning?n.target.set(0,0,-1).transformDirection(n.object.matrix).multiplyScalar(r).add(n.object.position):(d.origin.copy(n.object.position),d.direction.set(0,0,-1).transformDirection(n.object.matrix),Math.abs(n.object.up.dot(d.direction))<p?e.lookAt(n.target):(f.setFromNormalAndCoplanarPoint(n.object.up,n.target),d.intersectPlane(f,n.target))))}else n.object instanceof a.qUd&&n.object.isOrthographicCamera&&(S=1!==g)&&(n.object.zoom=Math.max(n.minZoom,Math.min(n.maxZoom,n.object.zoom/g)),n.object.updateProjectionMatrix());return g=1,P=!1,!!(S||h.distanceToSquared(n.object.position)>c||8*(1-y.dot(n.object.quaternion))>c)&&(n.dispatchEvent(r),h.copy(n.object.position),y.copy(n.object.quaternion),S=!1,!0)}})(),this.connect=e=>{n.domElement=e,n.domElement.style.touchAction="none",n.domElement.addEventListener("contextmenu",et),n.domElement.addEventListener("pointerdown",$),n.domElement.addEventListener("pointercancel",Q),n.domElement.addEventListener("wheel",J)},this.dispose=()=>{var e,t,r,i,o,a;n.domElement&&(n.domElement.style.touchAction="auto"),null==(e=n.domElement)||e.removeEventListener("contextmenu",et),null==(t=n.domElement)||t.removeEventListener("pointerdown",$),null==(r=n.domElement)||r.removeEventListener("pointercancel",Q),null==(i=n.domElement)||i.removeEventListener("wheel",J),null==(o=n.domElement)||o.ownerDocument.removeEventListener("pointermove",Z),null==(a=n.domElement)||a.ownerDocument.removeEventListener("pointerup",Q),null!==n._domElementKeyEvents&&n._domElementKeyEvents.removeEventListener("keydown",ee)};let n=this,r={type:"change"},i={type:"start"},o={type:"end"},s={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},l=s.NONE,c=1e-6,v=new a.YHV,m=new a.YHV,g=1,b=new a.Pq0,y=new a.I9Y,w=new a.I9Y,x=new a.I9Y,E=new a.I9Y,_=new a.I9Y,S=new a.I9Y,M=new a.I9Y,O=new a.I9Y,j=new a.I9Y,A=new a.Pq0,C=new a.I9Y,P=!1,T=[],L={};function D(){return Math.pow(.95,n.zoomSpeed)}function R(e){n.reverseOrbit||n.reverseHorizontalOrbit?m.theta+=e:m.theta-=e}function k(e){n.reverseOrbit||n.reverseVerticalOrbit?m.phi+=e:m.phi-=e}let I=(()=>{let e=new a.Pq0;return function(t,n){e.setFromMatrixColumn(n,0),e.multiplyScalar(-t),b.add(e)}})(),z=(()=>{let e=new a.Pq0;return function(t,r){!0===n.screenSpacePanning?e.setFromMatrixColumn(r,1):(e.setFromMatrixColumn(r,0),e.crossVectors(n.object.up,e)),e.multiplyScalar(t),b.add(e)}})(),U=(()=>{let e=new a.Pq0;return function(t,r){let i=n.domElement;if(i&&n.object instanceof a.ubm&&n.object.isPerspectiveCamera){let o=n.object.position;e.copy(o).sub(n.target);let a=e.length();I(2*t*(a*=Math.tan(n.object.fov/2*Math.PI/180))/i.clientHeight,n.object.matrix),z(2*r*a/i.clientHeight,n.object.matrix)}else i&&n.object instanceof a.qUd&&n.object.isOrthographicCamera?(I(t*(n.object.right-n.object.left)/n.object.zoom/i.clientWidth,n.object.matrix),z(r*(n.object.top-n.object.bottom)/n.object.zoom/i.clientHeight,n.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),n.enablePan=!1)}})();function F(e){n.object instanceof a.ubm&&n.object.isPerspectiveCamera||n.object instanceof a.qUd&&n.object.isOrthographicCamera?g=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),n.enableZoom=!1)}function N(e){if(!n.zoomToCursor||!n.domElement)return;P=!0;let t=n.domElement.getBoundingClientRect(),r=e.clientX-t.left,i=e.clientY-t.top,o=t.width,a=t.height;C.x=r/o*2-1,C.y=-(i/a*2)+1,A.set(C.x,C.y,1).unproject(n.object).sub(n.object.position).normalize()}function B(e){return Math.max(n.minDistance,Math.min(n.maxDistance,e))}function H(e){y.set(e.clientX,e.clientY)}function q(e){E.set(e.clientX,e.clientY)}function Y(){if(1==T.length)y.set(T[0].pageX,T[0].pageY);else{let e=.5*(T[0].pageX+T[1].pageX),t=.5*(T[0].pageY+T[1].pageY);y.set(e,t)}}function G(){if(1==T.length)E.set(T[0].pageX,T[0].pageY);else{let e=.5*(T[0].pageX+T[1].pageX),t=.5*(T[0].pageY+T[1].pageY);E.set(e,t)}}function W(){let e=T[0].pageX-T[1].pageX,t=T[0].pageY-T[1].pageY,n=Math.sqrt(e*e+t*t);M.set(0,n)}function X(e){if(1==T.length)w.set(e.pageX,e.pageY);else{let t=er(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);w.set(n,r)}x.subVectors(w,y).multiplyScalar(n.rotateSpeed);let t=n.domElement;t&&(R(2*Math.PI*x.x/t.clientHeight),k(2*Math.PI*x.y/t.clientHeight)),y.copy(w)}function K(e){if(1==T.length)_.set(e.pageX,e.pageY);else{let t=er(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);_.set(n,r)}S.subVectors(_,E).multiplyScalar(n.panSpeed),U(S.x,S.y),E.copy(_)}function V(e){var t;let r=er(e),i=e.pageX-r.x,o=e.pageY-r.y,a=Math.sqrt(i*i+o*o);O.set(0,a),j.set(0,Math.pow(O.y/M.y,n.zoomSpeed)),t=j.y,F(g/t),M.copy(O)}function $(e){var t,r,o;!1!==n.enabled&&(0===T.length&&(null==(t=n.domElement)||t.ownerDocument.addEventListener("pointermove",Z),null==(r=n.domElement)||r.ownerDocument.addEventListener("pointerup",Q)),o=e,T.push(o),"touch"===e.pointerType?function(e){switch(en(e),T.length){case 1:switch(n.touches.ONE){case a.wtR.ROTATE:if(!1===n.enableRotate)return;Y(),l=s.TOUCH_ROTATE;break;case a.wtR.PAN:if(!1===n.enablePan)return;G(),l=s.TOUCH_PAN;break;default:l=s.NONE}break;case 2:switch(n.touches.TWO){case a.wtR.DOLLY_PAN:if(!1===n.enableZoom&&!1===n.enablePan)return;n.enableZoom&&W(),n.enablePan&&G(),l=s.TOUCH_DOLLY_PAN;break;case a.wtR.DOLLY_ROTATE:if(!1===n.enableZoom&&!1===n.enableRotate)return;n.enableZoom&&W(),n.enableRotate&&Y(),l=s.TOUCH_DOLLY_ROTATE;break;default:l=s.NONE}break;default:l=s.NONE}l!==s.NONE&&n.dispatchEvent(i)}(e):function(e){let t;switch(e.button){case 0:t=n.mouseButtons.LEFT;break;case 1:t=n.mouseButtons.MIDDLE;break;case 2:t=n.mouseButtons.RIGHT;break;default:t=-1}switch(t){case a.kBv.DOLLY:if(!1===n.enableZoom)return;N(e),M.set(e.clientX,e.clientY),l=s.DOLLY;break;case a.kBv.ROTATE:if(e.ctrlKey||e.metaKey||e.shiftKey){if(!1===n.enablePan)return;q(e),l=s.PAN}else{if(!1===n.enableRotate)return;H(e),l=s.ROTATE}break;case a.kBv.PAN:if(e.ctrlKey||e.metaKey||e.shiftKey){if(!1===n.enableRotate)return;H(e),l=s.ROTATE}else{if(!1===n.enablePan)return;q(e),l=s.PAN}break;default:l=s.NONE}l!==s.NONE&&n.dispatchEvent(i)}(e))}function Z(e){!1!==n.enabled&&("touch"===e.pointerType?function(e){switch(en(e),l){case s.TOUCH_ROTATE:if(!1===n.enableRotate)return;X(e),n.update();break;case s.TOUCH_PAN:if(!1===n.enablePan)return;K(e),n.update();break;case s.TOUCH_DOLLY_PAN:if(!1===n.enableZoom&&!1===n.enablePan)return;n.enableZoom&&V(e),n.enablePan&&K(e),n.update();break;case s.TOUCH_DOLLY_ROTATE:if(!1===n.enableZoom&&!1===n.enableRotate)return;n.enableZoom&&V(e),n.enableRotate&&X(e),n.update();break;default:l=s.NONE}}(e):function(e){if(!1!==n.enabled)switch(l){case s.ROTATE:if(!1===n.enableRotate)return;w.set(e.clientX,e.clientY),x.subVectors(w,y).multiplyScalar(n.rotateSpeed);let t=n.domElement;t&&(R(2*Math.PI*x.x/t.clientHeight),k(2*Math.PI*x.y/t.clientHeight)),y.copy(w),n.update();break;case s.DOLLY:var r,i;if(!1===n.enableZoom)return;(O.set(e.clientX,e.clientY),j.subVectors(O,M),j.y>0)?(r=D(),F(g/r)):j.y<0&&(i=D(),F(g*i)),M.copy(O),n.update();break;case s.PAN:if(!1===n.enablePan)return;_.set(e.clientX,e.clientY),S.subVectors(_,E).multiplyScalar(n.panSpeed),U(S.x,S.y),E.copy(_),n.update()}}(e))}function Q(e){var t,r,i;(function(e){delete L[e.pointerId];for(let t=0;t<T.length;t++)if(T[t].pointerId==e.pointerId)return void T.splice(t,1)})(e),0===T.length&&(null==(t=n.domElement)||t.releasePointerCapture(e.pointerId),null==(r=n.domElement)||r.ownerDocument.removeEventListener("pointermove",Z),null==(i=n.domElement)||i.ownerDocument.removeEventListener("pointerup",Q)),n.dispatchEvent(o),l=s.NONE}function J(e){if(!1!==n.enabled&&!1!==n.enableZoom&&(l===s.NONE||l===s.ROTATE)){var t,r;e.preventDefault(),n.dispatchEvent(i),(N(e),e.deltaY<0)?(t=D(),F(g*t)):e.deltaY>0&&(r=D(),F(g/r)),n.update(),n.dispatchEvent(o)}}function ee(e){if(!1!==n.enabled&&!1!==n.enablePan){let t=!1;switch(e.code){case n.keys.UP:U(0,n.keyPanSpeed),t=!0;break;case n.keys.BOTTOM:U(0,-n.keyPanSpeed),t=!0;break;case n.keys.LEFT:U(n.keyPanSpeed,0),t=!0;break;case n.keys.RIGHT:U(-n.keyPanSpeed,0),t=!0}t&&(e.preventDefault(),n.update())}}function et(e){!1!==n.enabled&&e.preventDefault()}function en(e){let t=L[e.pointerId];void 0===t&&(t=new a.I9Y,L[e.pointerId]=t),t.set(e.pageX,e.pageY)}function er(e){return L[(e.pointerId===T[0].pointerId?T[1]:T[0]).pointerId]}this.dollyIn=(e=D())=>{F(g*e),n.update()},this.dollyOut=(e=D())=>{F(g/e),n.update()},this.getScale=()=>g,this.setScale=e=>{F(e),n.update()},this.getZoomScale=()=>D(),void 0!==t&&this.connect(t),this.update()}}let m=o.forwardRef(({makeDefault:e,camera:t,regress:n,domElement:a,enableDamping:s=!0,keyEvents:l=!1,onChange:c,onStart:u,onEnd:d,...f},p)=>{let h=(0,i.C)(e=>e.invalidate),m=(0,i.C)(e=>e.camera),g=(0,i.C)(e=>e.gl),b=(0,i.C)(e=>e.events),y=(0,i.C)(e=>e.setEvents),w=(0,i.C)(e=>e.set),x=(0,i.C)(e=>e.get),E=(0,i.C)(e=>e.performance),_=t||m,S=a||b.connected||g.domElement,M=o.useMemo(()=>new v(_),[_]);return(0,i.D)(()=>{M.enabled&&M.update()},-1),o.useEffect(()=>(l&&M.connect(!0===l?S:l),M.connect(S),()=>void M.dispose()),[l,S,n,M,h]),o.useEffect(()=>{let e=e=>{h(),n&&E.regress(),c&&c(e)},t=e=>{u&&u(e)},r=e=>{d&&d(e)};return M.addEventListener("change",e),M.addEventListener("start",t),M.addEventListener("end",r),()=>{M.removeEventListener("start",t),M.removeEventListener("end",r),M.removeEventListener("change",e)}},[c,u,d,M,h,y]),o.useEffect(()=>{if(e){let e=x().controls;return w({controls:M}),()=>w({controls:e})}},[e,M]),o.createElement("primitive",(0,r.A)({ref:p,object:M,enableDamping:s},f))})},5653:(e,t,n)=>{n.d(t,{Hl:()=>d});var r=n(3353),i=n(4364),o=n(7964);function a(e,t){let n;return(...r)=>{window.clearTimeout(n),n=window.setTimeout(()=>e(...r),t)}}let s=["x","y","top","bottom","left","right","width","height"];var l=n(7795),c=n(6496);function u({ref:e,children:t,fallback:n,resize:l,style:u,gl:d,events:f=r.f,eventSource:p,eventPrefix:h,shadows:v,linear:m,flat:g,legacy:b,orthographic:y,frameloop:w,dpr:x,performance:E,raycaster:_,camera:S,scene:M,onPointerMissed:O,onCreated:j,...A}){i.useMemo(()=>(0,r.e)(o),[]);let C=(0,r.u)(),[P,T]=function({debounce:e,scroll:t,polyfill:n,offsetSize:r}={debounce:0,scroll:!1,offsetSize:!1}){var o,l,c;let u=n||("undefined"==typeof window?class{}:window.ResizeObserver);if(!u)throw Error("This browser does not support ResizeObserver out of the box. See: https://github.com/react-spring/react-use-measure/#resize-observer-polyfills");let[d,f]=(0,i.useState)({left:0,top:0,width:0,height:0,bottom:0,right:0,x:0,y:0}),p=(0,i.useRef)({element:null,scrollContainers:null,resizeObserver:null,lastBounds:d,orientationHandler:null}),h=e?"number"==typeof e?e:e.scroll:null,v=e?"number"==typeof e?e:e.resize:null,m=(0,i.useRef)(!1);(0,i.useEffect)(()=>(m.current=!0,()=>void(m.current=!1)));let[g,b,y]=(0,i.useMemo)(()=>{let e=()=>{let e,t;if(!p.current.element)return;let{left:n,top:i,width:o,height:a,bottom:l,right:c,x:u,y:d}=p.current.element.getBoundingClientRect(),h={left:n,top:i,width:o,height:a,bottom:l,right:c,x:u,y:d};p.current.element instanceof HTMLElement&&r&&(h.height=p.current.element.offsetHeight,h.width=p.current.element.offsetWidth),Object.freeze(h),m.current&&(e=p.current.lastBounds,t=h,!s.every(n=>e[n]===t[n]))&&f(p.current.lastBounds=h)};return[e,v?a(e,v):e,h?a(e,h):e]},[f,r,h,v]);function w(){p.current.scrollContainers&&(p.current.scrollContainers.forEach(e=>e.removeEventListener("scroll",y,!0)),p.current.scrollContainers=null),p.current.resizeObserver&&(p.current.resizeObserver.disconnect(),p.current.resizeObserver=null),p.current.orientationHandler&&("orientation"in screen&&"removeEventListener"in screen.orientation?screen.orientation.removeEventListener("change",p.current.orientationHandler):"onorientationchange"in window&&window.removeEventListener("orientationchange",p.current.orientationHandler))}function x(){p.current.element&&(p.current.resizeObserver=new u(y),p.current.resizeObserver.observe(p.current.element),t&&p.current.scrollContainers&&p.current.scrollContainers.forEach(e=>e.addEventListener("scroll",y,{capture:!0,passive:!0})),p.current.orientationHandler=()=>{y()},"orientation"in screen&&"addEventListener"in screen.orientation?screen.orientation.addEventListener("change",p.current.orientationHandler):"onorientationchange"in window&&window.addEventListener("orientationchange",p.current.orientationHandler))}return o=y,l=!!t,(0,i.useEffect)(()=>{if(l)return window.addEventListener("scroll",o,{capture:!0,passive:!0}),()=>void window.removeEventListener("scroll",o,!0)},[o,l]),c=b,(0,i.useEffect)(()=>(window.addEventListener("resize",c),()=>void window.removeEventListener("resize",c)),[c]),(0,i.useEffect)(()=>{w(),x()},[t,y,b]),(0,i.useEffect)(()=>w,[]),[e=>{e&&e!==p.current.element&&(w(),p.current.element=e,p.current.scrollContainers=function e(t){let n=[];if(!t||t===document.body)return n;let{overflow:r,overflowX:i,overflowY:o}=window.getComputedStyle(t);return[r,i,o].some(e=>"auto"===e||"scroll"===e)&&n.push(t),[...n,...e(t.parentElement)]}(e),x())},d,g]}({scroll:!0,debounce:{scroll:50,resize:0},...l}),L=i.useRef(null),D=i.useRef(null);i.useImperativeHandle(e,()=>L.current);let R=(0,r.a)(O),[k,I]=i.useState(!1),[z,U]=i.useState(!1);if(k)throw k;if(z)throw z;let F=i.useRef(null);(0,r.b)(()=>{let e=L.current;T.width>0&&T.height>0&&e&&(F.current||(F.current=(0,r.c)(e)),async function(){await F.current.configure({gl:d,scene:M,events:f,shadows:v,linear:m,flat:g,legacy:b,orthographic:y,frameloop:w,dpr:x,performance:E,raycaster:_,camera:S,size:T,onPointerMissed:(...e)=>null==R.current?void 0:R.current(...e),onCreated:e=>{null==e.events.connect||e.events.connect(p?(0,r.i)(p)?p.current:p:D.current),h&&e.setEvents({compute:(e,t)=>{let n=e[h+"X"],r=e[h+"Y"];t.pointer.set(n/t.size.width*2-1,-(2*(r/t.size.height))+1),t.raycaster.setFromCamera(t.pointer,t.camera)}}),null==j||j(e)}}),F.current.render((0,c.jsx)(C,{children:(0,c.jsx)(r.E,{set:U,children:(0,c.jsx)(i.Suspense,{fallback:(0,c.jsx)(r.B,{set:I}),children:null!=t?t:null})})}))}())}),i.useEffect(()=>{let e=L.current;if(e)return()=>(0,r.d)(e)},[]);let N=p?"none":"auto";return(0,c.jsx)("div",{ref:D,style:{position:"relative",width:"100%",height:"100%",overflow:"hidden",pointerEvents:N,...u},...A,children:(0,c.jsx)("div",{ref:P,style:{width:"100%",height:"100%"},children:(0,c.jsx)("canvas",{ref:L,style:{display:"block"},children:n})})})}function d(e){return(0,c.jsx)(l.Af,{children:(0,c.jsx)(u,{...e})})}n(4644),n(7969),n(4762)},5717:(e,t,n)=>{var r,i;n.d(t,{m:()=>l}),function(e){e.LOAD="LOAD",e.EXEC="EXEC",e.FFPROBE="FFPROBE",e.WRITE_FILE="WRITE_FILE",e.READ_FILE="READ_FILE",e.DELETE_FILE="DELETE_FILE",e.RENAME="RENAME",e.CREATE_DIR="CREATE_DIR",e.LIST_DIR="LIST_DIR",e.DELETE_DIR="DELETE_DIR",e.ERROR="ERROR",e.DOWNLOAD="DOWNLOAD",e.PROGRESS="PROGRESS",e.LOG="LOG",e.MOUNT="MOUNT",e.UNMOUNT="UNMOUNT"}(r||(r={}));let o=(()=>{let e=0;return()=>e++})();Error("unknown message type");let a=Error("ffmpeg is not loaded, call `await ffmpeg.load()` first"),s=Error("called FFmpeg.terminate()");Error("failed to import ffmpeg-core.js");class l{#e=null;#t={};#n={};#r=[];#i=[];loaded=!1;#o=()=>{this.#e&&(this.#e.onmessage=({data:{id:e,type:t,data:n}})=>{switch(t){case r.LOAD:this.loaded=!0,this.#t[e](n);break;case r.MOUNT:case r.UNMOUNT:case r.EXEC:case r.FFPROBE:case r.WRITE_FILE:case r.READ_FILE:case r.DELETE_FILE:case r.RENAME:case r.CREATE_DIR:case r.LIST_DIR:case r.DELETE_DIR:this.#t[e](n);break;case r.LOG:this.#r.forEach(e=>e(n));break;case r.PROGRESS:this.#i.forEach(e=>e(n));break;case r.ERROR:this.#n[e](n)}delete this.#t[e],delete this.#n[e]})};#a=({type:e,data:t},n=[],r)=>this.#e?new Promise((i,a)=>{let s=o();this.#e&&this.#e.postMessage({id:s,type:e,data:t},n),this.#t[s]=i,this.#n[s]=a,r?.addEventListener("abort",()=>{a(new DOMException(`Message # ${s} was aborted`,"AbortError"))},{once:!0})}):Promise.reject(a);on(e,t){"log"===e?this.#r.push(t):"progress"===e&&this.#i.push(t)}off(e,t){"log"===e?this.#r=this.#r.filter(e=>e!==t):"progress"===e&&(this.#i=this.#i.filter(e=>e!==t))}load=({classWorkerURL:e,...t}={},{signal:i}={})=>(this.#e||(this.#e=e?new Worker(new URL(e,"file:///home/runner/work/Browzarr/Browzarr/node_modules/.pnpm/@ffmpeg+ffmpeg@0.12.15/node_modules/@ffmpeg/ffmpeg/dist/esm/classes.js"),{type:"module"}):new Worker(n.tu(new URL(n.p+n.u(567),n.b)),{type:void 0}),this.#o()),this.#a({type:r.LOAD,data:t},void 0,i));exec=(e,t=-1,{signal:n}={})=>this.#a({type:r.EXEC,data:{args:e,timeout:t}},void 0,n);ffprobe=(e,t=-1,{signal:n}={})=>this.#a({type:r.FFPROBE,data:{args:e,timeout:t}},void 0,n);terminate=()=>{for(let e of Object.keys(this.#n))this.#n[e](s),delete this.#n[e],delete this.#t[e];this.#e&&(this.#e.terminate(),this.#e=null,this.loaded=!1)};writeFile=(e,t,{signal:n}={})=>{let i=[];return t instanceof Uint8Array&&i.push(t.buffer),this.#a({type:r.WRITE_FILE,data:{path:e,data:t}},i,n)};mount=(e,t,n)=>this.#a({type:r.MOUNT,data:{fsType:e,options:t,mountPoint:n}},[]);unmount=e=>this.#a({type:r.UNMOUNT,data:{mountPoint:e}},[]);readFile=(e,t="binary",{signal:n}={})=>this.#a({type:r.READ_FILE,data:{path:e,encoding:t}},void 0,n);deleteFile=(e,{signal:t}={})=>this.#a({type:r.DELETE_FILE,data:{path:e}},void 0,t);rename=(e,t,{signal:n}={})=>this.#a({type:r.RENAME,data:{oldPath:e,newPath:t}},void 0,n);createDir=(e,{signal:t}={})=>this.#a({type:r.CREATE_DIR,data:{path:e}},void 0,t);listDir=(e,{signal:t}={})=>this.#a({type:r.LIST_DIR,data:{path:e}},void 0,t);deleteDir=(e,{signal:t}={})=>this.#a({type:r.DELETE_DIR,data:{path:e}},void 0,t)}!function(e){e.MEMFS="MEMFS",e.NODEFS="NODEFS",e.NODERAWFS="NODERAWFS",e.IDBFS="IDBFS",e.WORKERFS="WORKERFS",e.PROXYFS="PROXYFS"}(i||(i={}))},6341:(e,t,n)=>{n.d(t,{G:()=>a});var r=n(2331),i=n(7964);let o=parseInt(r.sPf.replace(/\D+/g,""));class a extends r.BKk{constructor(e){super({type:"LineMaterial",uniforms:r.LlO.clone(r.LlO.merge([i.UniformsLib.common,i.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new r.I9Y(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
				#include <common>
				#include <fog_pars_vertex>
				#include <logdepthbuf_pars_vertex>
				#include <clipping_planes_pars_vertex>

				uniform float linewidth;
				uniform vec2 resolution;

				attribute vec3 instanceStart;
				attribute vec3 instanceEnd;

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
						attribute vec4 instanceColorStart;
						attribute vec4 instanceColorEnd;
					#else
						varying vec3 vLineColor;
						attribute vec3 instanceColorStart;
						attribute vec3 instanceColorEnd;
					#endif
				#endif

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#ifdef USE_DASH

					uniform float dashScale;
					attribute float instanceDistanceStart;
					attribute float instanceDistanceEnd;
					varying float vLineDistance;

				#endif

				void trimSegment( const in vec4 start, inout vec4 end ) {

					// trim end segment so it terminates between the camera plane and the near plane

					// conservative estimate of the near plane
					float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
					float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
					float nearEstimate = - 0.5 * b / a;

					float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

					end.xyz = mix( start.xyz, end.xyz, alpha );

				}

				void main() {

					#ifdef USE_COLOR

						vLineColor = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

					#endif

					#ifdef USE_DASH

						vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
						vUv = uv;

					#endif

					float aspect = resolution.x / resolution.y;

					// camera space
					vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
					vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

					#ifdef WORLD_UNITS

						worldStart = start.xyz;
						worldEnd = end.xyz;

					#else

						vUv = uv;

					#endif

					// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
					// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
					// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
					// perhaps there is a more elegant solution -- WestLangley

					bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

					if ( perspective ) {

						if ( start.z < 0.0 && end.z >= 0.0 ) {

							trimSegment( start, end );

						} else if ( end.z < 0.0 && start.z >= 0.0 ) {

							trimSegment( end, start );

						}

					}

					// clip space
					vec4 clipStart = projectionMatrix * start;
					vec4 clipEnd = projectionMatrix * end;

					// ndc space
					vec3 ndcStart = clipStart.xyz / clipStart.w;
					vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

					// direction
					vec2 dir = ndcEnd.xy - ndcStart.xy;

					// account for clip-space aspect ratio
					dir.x *= aspect;
					dir = normalize( dir );

					#ifdef WORLD_UNITS

						// get the offset direction as perpendicular to the view vector
						vec3 worldDir = normalize( end.xyz - start.xyz );
						vec3 offset;
						if ( position.y < 0.5 ) {

							offset = normalize( cross( start.xyz, worldDir ) );

						} else {

							offset = normalize( cross( end.xyz, worldDir ) );

						}

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						float forwardOffset = dot( worldDir, vec3( 0.0, 0.0, 1.0 ) );

						// don't extend the line if we're rendering dashes because we
						// won't be rendering the endcaps
						#ifndef USE_DASH

							// extend the line bounds to encompass  endcaps
							start.xyz += - worldDir * linewidth * 0.5;
							end.xyz += worldDir * linewidth * 0.5;

							// shift the position of the quad so it hugs the forward edge of the line
							offset.xy -= dir * forwardOffset;
							offset.z += 0.5;

						#endif

						// endcaps
						if ( position.y > 1.0 || position.y < 0.0 ) {

							offset.xy += dir * 2.0 * forwardOffset;

						}

						// adjust for linewidth
						offset *= linewidth * 0.5;

						// set the world position
						worldPos = ( position.y < 0.5 ) ? start : end;
						worldPos.xyz += offset;

						// project the worldpos
						vec4 clip = projectionMatrix * worldPos;

						// shift the depth of the projected points so the line
						// segments overlap neatly
						vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
						clip.z = clipPose.z * clip.w;

					#else

						vec2 offset = vec2( dir.y, - dir.x );
						// undo aspect ratio adjustment
						dir.x /= aspect;
						offset.x /= aspect;

						// sign flip
						if ( position.x < 0.0 ) offset *= - 1.0;

						// endcaps
						if ( position.y < 0.0 ) {

							offset += - dir;

						} else if ( position.y > 1.0 ) {

							offset += dir;

						}

						// adjust for linewidth
						offset *= linewidth;

						// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
						offset /= resolution.y;

						// select end
						vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

						// back to clip space
						offset *= clip.w;

						clip.xy += offset;

					#endif

					gl_Position = clip;

					vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

					#include <logdepthbuf_vertex>
					#include <clipping_planes_vertex>
					#include <fog_vertex>

				}
			`,fragmentShader:`
				uniform vec3 diffuse;
				uniform float opacity;
				uniform float linewidth;

				#ifdef USE_DASH

					uniform float dashOffset;
					uniform float dashSize;
					uniform float gapSize;

				#endif

				varying float vLineDistance;

				#ifdef WORLD_UNITS

					varying vec4 worldPos;
					varying vec3 worldStart;
					varying vec3 worldEnd;

					#ifdef USE_DASH

						varying vec2 vUv;

					#endif

				#else

					varying vec2 vUv;

				#endif

				#include <common>
				#include <fog_pars_fragment>
				#include <logdepthbuf_pars_fragment>
				#include <clipping_planes_pars_fragment>

				#ifdef USE_COLOR
					#ifdef USE_LINE_COLOR_ALPHA
						varying vec4 vLineColor;
					#else
						varying vec3 vLineColor;
					#endif
				#endif

				vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

					float mua;
					float mub;

					vec3 p13 = p1 - p3;
					vec3 p43 = p4 - p3;

					vec3 p21 = p2 - p1;

					float d1343 = dot( p13, p43 );
					float d4321 = dot( p43, p21 );
					float d1321 = dot( p13, p21 );
					float d4343 = dot( p43, p43 );
					float d2121 = dot( p21, p21 );

					float denom = d2121 * d4343 - d4321 * d4321;

					float numer = d1343 * d4321 - d1321 * d4343;

					mua = numer / denom;
					mua = clamp( mua, 0.0, 1.0 );
					mub = ( d1343 + d4321 * ( mua ) ) / d4343;
					mub = clamp( mub, 0.0, 1.0 );

					return vec2( mua, mub );

				}

				void main() {

					#include <clipping_planes_fragment>

					#ifdef USE_DASH

						if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

						if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

					#endif

					float alpha = opacity;

					#ifdef WORLD_UNITS

						// Find the closest points on the view ray and the line segment
						vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
						vec3 lineDir = worldEnd - worldStart;
						vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

						vec3 p1 = worldStart + lineDir * params.x;
						vec3 p2 = rayEnd * params.y;
						vec3 delta = p1 - p2;
						float len = length( delta );
						float norm = len / linewidth;

						#ifndef USE_DASH

							#ifdef USE_ALPHA_TO_COVERAGE

								float dnorm = fwidth( norm );
								alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

							#else

								if ( norm > 0.5 ) {

									discard;

								}

							#endif

						#endif

					#else

						#ifdef USE_ALPHA_TO_COVERAGE

							// artifacts appear on some hardware if a derivative is taken within a conditional
							float a = vUv.x;
							float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
							float len2 = a * a + b * b;
							float dlen = fwidth( len2 );

							if ( abs( vUv.y ) > 1.0 ) {

								alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

							}

						#else

							if ( abs( vUv.y ) > 1.0 ) {

								float a = vUv.x;
								float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
								float len2 = a * a + b * b;

								if ( len2 > 1.0 ) discard;

							}

						#endif

					#endif

					vec4 diffuseColor = vec4( diffuse, alpha );
					#ifdef USE_COLOR
						#ifdef USE_LINE_COLOR_ALPHA
							diffuseColor *= vLineColor;
						#else
							diffuseColor.rgb *= vLineColor;
						#endif
					#endif

					#include <logdepthbuf_fragment>

					gl_FragColor = diffuseColor;

					#include <tonemapping_fragment>
					#include <${o>=154?"colorspace_fragment":"encodings_fragment"}>
					#include <fog_fragment>
					#include <premultiplied_alpha_fragment>

				}
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}},6483:(e,t,n)=>{n.d(t,{A:()=>r});let r=function(){return function(e){var t,n,r,i,o={R:"13k,1a,2,3,3,2+1j,ch+16,a+1,5+2,2+n,5,a,4,6+16,4+3,h+1b,4mo,179q,2+9,2+11,2i9+7y,2+68,4,3+4,5+13,4+3,2+4k,3+29,8+cf,1t+7z,w+17,3+3m,1t+3z,16o1+5r,8+30,8+mc,29+1r,29+4v,75+73",EN:"1c+9,3d+1,6,187+9,513,4+5,7+9,sf+j,175h+9,qw+q,161f+1d,4xt+a,25i+9",ES:"17,2,6dp+1,f+1,av,16vr,mx+1,4o,2",ET:"z+2,3h+3,b+1,ym,3e+1,2o,p4+1,8,6u,7c,g6,1wc,1n9+4,30+1b,2n,6d,qhx+1,h0m,a+1,49+2,63+1,4+1,6bb+3,12jj",AN:"16o+5,2j+9,2+1,35,ed,1ff2+9,87+u",CS:"18,2+1,b,2u,12k,55v,l,17v0,2,3,53,2+1,b",B:"a,3,f+2,2v,690",S:"9,2,k",WS:"c,k,4f4,1vk+a,u,1j,335",ON:"x+1,4+4,h+5,r+5,r+3,z,5+3,2+1,2+1,5,2+2,3+4,o,w,ci+1,8+d,3+d,6+8,2+g,39+1,9,6+1,2,33,b8,3+1,3c+1,7+1,5r,b,7h+3,sa+5,2,3i+6,jg+3,ur+9,2v,ij+1,9g+9,7+a,8m,4+1,49+x,14u,2+2,c+2,e+2,e+2,e+1,i+n,e+e,2+p,u+2,e+2,36+1,2+3,2+1,b,2+2,6+5,2,2,2,h+1,5+4,6+3,3+f,16+2,5+3l,3+81,1y+p,2+40,q+a,m+13,2r+ch,2+9e,75+hf,3+v,2+2w,6e+5,f+6,75+2a,1a+p,2+2g,d+5x,r+b,6+3,4+o,g,6+1,6+2,2k+1,4,2j,5h+z,1m+1,1e+f,t+2,1f+e,d+3,4o+3,2s+1,w,535+1r,h3l+1i,93+2,2s,b+1,3l+x,2v,4g+3,21+3,kz+1,g5v+1,5a,j+9,n+v,2,3,2+8,2+1,3+2,2,3,46+1,4+4,h+5,r+5,r+a,3h+2,4+6,b+4,78,1r+24,4+c,4,1hb,ey+6,103+j,16j+c,1ux+7,5+g,fsh,jdq+1t,4,57+2e,p1,1m,1m,1m,1m,4kt+1,7j+17,5+2r,d+e,3+e,2+e,2+10,m+4,w,1n+5,1q,4z+5,4b+rb,9+c,4+c,4+37,d+2g,8+b,l+b,5+1j,9+9,7+13,9+t,3+1,27+3c,2+29,2+3q,d+d,3+4,4+2,6+6,a+o,8+6,a+2,e+6,16+42,2+1i",BN:"0+8,6+d,2s+5,2+p,e,4m9,1kt+2,2b+5,5+5,17q9+v,7k,6p+8,6+1,119d+3,440+7,96s+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+75,6p+2rz,1ben+1,1ekf+1,1ekf+1",NSM:"lc+33,7o+6,7c+18,2,2+1,2+1,2,21+a,1d+k,h,2u+6,3+5,3+1,2+3,10,v+q,2k+a,1n+8,a,p+3,2+8,2+2,2+4,18+2,3c+e,2+v,1k,2,5+7,5,4+6,b+1,u,1n,5+3,9,l+1,r,3+1,1m,5+1,5+1,3+2,4,v+1,4,c+1,1m,5+4,2+1,5,l+1,n+5,2,1n,3,2+3,9,8+1,c+1,v,1q,d,1f,4,1m+2,6+2,2+3,8+1,c+1,u,1n,g+1,l+1,t+1,1m+1,5+3,9,l+1,u,21,8+2,2,2j,3+6,d+7,2r,3+8,c+5,23+1,s,2,2,1k+d,2+4,2+1,6+a,2+z,a,2v+3,2+5,2+1,3+1,q+1,5+2,h+3,e,3+1,7,g,jk+2,qb+2,u+2,u+1,v+1,1t+1,2+6,9,3+a,a,1a+2,3c+1,z,3b+2,5+1,a,7+2,64+1,3,1n,2+6,2,2,3+7,7+9,3,1d+g,1s+3,1d,2+4,2,6,15+8,d+1,x+3,3+1,2+2,1l,2+1,4,2+2,1n+7,3+1,49+2,2+c,2+6,5,7,4+1,5j+1l,2+4,k1+w,2db+2,3y,2p+v,ff+3,30+1,n9x+3,2+9,x+1,29+1,7l,4,5,q+1,6,48+1,r+h,e,13+7,q+a,1b+2,1d,3+3,3+1,14,1w+5,3+1,3+1,d,9,1c,1g,2+2,3+1,6+1,2,17+1,9,6n,3,5,fn5,ki+f,h+f,r2,6b,46+4,1af+2,2+1,6+3,15+2,5,4m+1,fy+3,as+1,4a+a,4x,1j+e,1l+2,1e+3,3+1,1y+2,11+4,2+7,1r,d+1,1h+8,b+3,3,2o+2,3,2+1,7,4h,4+7,m+1,1m+1,4,12+6,4+4,5g+7,3+2,2,o,2d+5,2,5+1,2+1,6n+3,7+1,2+1,s+1,2e+7,3,2+1,2z,2,3+5,2,2u+2,3+3,2+4,78+8,2+1,75+1,2,5,41+3,3+1,5,x+5,3+1,15+5,3+3,9,a+5,3+2,1b+c,2+1,bb+6,2+5,2d+l,3+6,2+1,2+1,3f+5,4,2+1,2+6,2,21+1,4,2,9o+1,f0c+4,1o+6,t5,1s+3,2a,f5l+1,43t+2,i+7,3+6,v+3,45+2,1j0+1i,5+1d,9,f,n+4,2+e,11t+6,2+g,3+6,2+1,2+4,7a+6,c6+3,15t+6,32+6,gzhy+6n",AL:"16w,3,2,e+1b,z+2,2+2s,g+1,8+1,b+m,2+t,s+2i,c+e,4h+f,1d+1e,1bwe+dp,3+3z,x+c,2+1,35+3y,2rm+z,5+7,b+5,dt+l,c+u,17nl+27,1t+27,4x+6n,3+d",LRO:"6ct",RLO:"6cu",LRE:"6cq",RLE:"6cr",PDF:"6cs",LRI:"6ee",RLI:"6ef",FSI:"6eg",PDI:"6eh"},a={},s={};a.L=1,s[1]="L",Object.keys(o).forEach(function(e,t){a[e]=1<<t+1,s[a[e]]=e}),Object.freeze(a);var l=a.LRI|a.RLI|a.FSI,c=a.L|a.R|a.AL,u=a.B|a.S|a.WS|a.ON|a.FSI|a.LRI|a.RLI|a.PDI,d=a.BN|a.RLE|a.LRE|a.RLO|a.LRO|a.PDF,f=a.S|a.WS|a.B|l|a.PDI|d,p=null;function h(e){if(!p){p=new Map;var t=function(e){if(o.hasOwnProperty(e)){var t=0;o[e].split(",").forEach(function(n){var r=n.split("+"),i=r[0],o=r[1];i=parseInt(i,36),o=o?parseInt(o,36):0,p.set(t+=i,a[e]);for(var s=0;s<o;s++)p.set(++t,a[e])})}};for(var n in o)t(n)}return p.get(e.codePointAt(0))||a.L}function v(e,t){var n,r=0,i=new Map,o=t&&new Map;return e.split(",").forEach(function e(a){if(-1!==a.indexOf("+"))for(var s=+a;s--;)e(n);else{n=a;var l=a.split(">"),c=l[0],u=l[1];c=String.fromCodePoint(r+=parseInt(c,36)),u=String.fromCodePoint(r+=parseInt(u,36)),i.set(c,u),t&&o.set(u,c)}}),{map:i,reverseMap:o}}function m(){if(!t){var e=v("14>1,1e>2,u>2,2wt>1,1>1,1ge>1,1wp>1,1j>1,f>1,hm>1,1>1,u>1,u6>1,1>1,+5,28>1,w>1,1>1,+3,b8>1,1>1,+3,1>3,-1>-1,3>1,1>1,+2,1s>1,1>1,x>1,th>1,1>1,+2,db>1,1>1,+3,3>1,1>1,+2,14qm>1,1>1,+1,4q>1,1e>2,u>2,2>1,+1",!0),i=e.map,o=e.reverseMap;t=i,n=o,r=v("6f1>-6dx,6dy>-6dx,6ec>-6ed,6ee>-6ed,6ww>2jj,-2ji>2jj,14r4>-1e7l,1e7m>-1e7l,1e7m>-1e5c,1e5d>-1e5b,1e5c>-14qx,14qy>-14qx,14vn>-1ecg,1ech>-1ecg,1edu>-1ecg,1eci>-1ecg,1eda>-1ecg,1eci>-1ecg,1eci>-168q,168r>-168q,168s>-14ye,14yf>-14ye",!1).map}}function g(e){return m(),t.get(e)||null}function b(e){return m(),n.get(e)||null}function y(e){return m(),r.get(e)||null}var w=a.L,x=a.R,E=a.EN,_=a.ES,S=a.ET,M=a.AN,O=a.CS,j=a.B,A=a.S,C=a.ON,P=a.BN,T=a.NSM,L=a.AL,D=a.LRO,R=a.RLO,k=a.LRE,I=a.RLE,z=a.PDF,U=a.LRI,F=a.RLI,N=a.FSI,B=a.PDI;function H(e){if(!i){var t=v("14>1,j>2,t>2,u>2,1a>g,2v3>1,1>1,1ge>1,1wd>1,b>1,1j>1,f>1,ai>3,-2>3,+1,8>1k0,-1jq>1y7,-1y6>1hf,-1he>1h6,-1h5>1ha,-1h8>1qi,-1pu>1,6>3u,-3s>7,6>1,1>1,f>1,1>1,+2,3>1,1>1,+13,4>1,1>1,6>1eo,-1ee>1,3>1mg,-1me>1mk,-1mj>1mi,-1mg>1mi,-1md>1,1>1,+2,1>10k,-103>1,1>1,4>1,5>1,1>1,+10,3>1,1>8,-7>8,+1,-6>7,+1,a>1,1>1,u>1,u6>1,1>1,+5,26>1,1>1,2>1,2>2,8>1,7>1,4>1,1>1,+5,b8>1,1>1,+3,1>3,-2>1,2>1,1>1,+2,c>1,3>1,1>1,+2,h>1,3>1,a>1,1>1,2>1,3>1,1>1,d>1,f>1,3>1,1a>1,1>1,6>1,7>1,13>1,k>1,1>1,+19,4>1,1>1,+2,2>1,1>1,+18,m>1,a>1,1>1,lk>1,1>1,4>1,2>1,f>1,3>1,1>1,+3,db>1,1>1,+3,3>1,1>1,+2,14qm>1,1>1,+1,6>1,4j>1,j>2,t>2,u>2,2>1,+1",!0),n=t.map;t.reverseMap.forEach(function(e,t){n.set(t,e)}),i=n}return i.get(e)||null}function q(e,t,n,r){var i=e.length;n=Math.max(0,null==n?0:+n),r=Math.min(i-1,null==r?i-1:+r);var o=[];return t.paragraphs.forEach(function(i){var a=Math.max(n,i.start),s=Math.min(r,i.end);if(a<s){for(var l=t.levels.slice(a,s+1),c=s;c>=a&&h(e[c])&f;c--)l[c]=i.level;for(var u=i.level,d=1/0,p=0;p<l.length;p++){var v=l[p];v>u&&(u=v),v<d&&(d=1|v)}for(var m=u;m>=d;m--)for(var g=0;g<l.length;g++)if(l[g]>=m){for(var b=g;g+1<l.length&&l[g+1]>=m;)g++;g>b&&o.push([b+a,g+a])}}}),o}function Y(e,t,n,r){for(var i=q(e,t,n,r),o=[],a=0;a<e.length;a++)o[a]=a;return i.forEach(function(e){for(var t=e[0],n=e[1],r=o.slice(t,n+1),i=r.length;i--;)o[n-i]=r[i]}),o}return e.closingToOpeningBracket=b,e.getBidiCharType=h,e.getBidiCharTypeName=function(e){return s[h(e)]},e.getCanonicalBracket=y,e.getEmbeddingLevels=function(e,t){for(var n=new Uint32Array(e.length),r=0;r<e.length;r++)n[r]=h(e[r]);var i=new Map;function o(e,t){var r=n[e];n[e]=t,i.set(r,i.get(r)-1),r&u&&i.set(u,i.get(u)-1),i.set(t,(i.get(t)||0)+1),t&u&&i.set(u,(i.get(u)||0)+1)}for(var a=new Uint8Array(e.length),s=new Map,p=[],v=null,m=0;m<e.length;m++)v||p.push(v={start:m,end:e.length-1,level:"rtl"===t?1:"ltr"===t?0:tP(m,!1)}),n[m]&j&&(v.end=m,v=null);for(var H=I|k|R|D|l|B|z|j,q=function(e){return e+(1&e?1:2)},Y=function(e){return e+(1&e?2:1)},G=0;G<p.length;G++){var W=[{_level:(v=p[G]).level,_override:0,_isolate:0}],X=void 0,K=0,V=0,$=0;i.clear();for(var Z=v.start;Z<=v.end;Z++){var Q=n[Z];if(X=W[W.length-1],i.set(Q,(i.get(Q)||0)+1),Q&u&&i.set(u,(i.get(u)||0)+1),Q&H)if(Q&(I|k)){a[Z]=X._level;var J=(Q===I?Y:q)(X._level);!(J<=125)||K||V?!K&&V++:W.push({_level:J,_override:0,_isolate:0})}else if(Q&(R|D)){a[Z]=X._level;var ee=(Q===R?Y:q)(X._level);!(ee<=125)||K||V?!K&&V++:W.push({_level:ee,_override:Q&R?x:w,_isolate:0})}else if(Q&l){Q&N&&(Q=1===tP(Z+1,!0)?F:U),a[Z]=X._level,X._override&&o(Z,X._override);var et=(Q===F?Y:q)(X._level);et<=125&&0===K&&0===V?($++,W.push({_level:et,_override:0,_isolate:1,_isolInitIndex:Z})):K++}else if(Q&B){if(K>0)K--;else if($>0){for(V=0;!W[W.length-1]._isolate;)W.pop();var en=W[W.length-1]._isolInitIndex;null!=en&&(s.set(en,Z),s.set(Z,en)),W.pop(),$--}X=W[W.length-1],a[Z]=X._level,X._override&&o(Z,X._override)}else Q&z?(0===K&&(V>0?V--:!X._isolate&&W.length>1&&(W.pop(),X=W[W.length-1])),a[Z]=X._level):Q&j&&(a[Z]=v.level);else a[Z]=X._level,X._override&&Q!==P&&o(Z,X._override)}for(var er=[],ei=null,eo=v.start;eo<=v.end;eo++){var ea=n[eo];if(!(ea&d)){var es=a[eo],el=ea&l,ec=ea===B;ei&&es===ei._level?(ei._end=eo,ei._endsWithIsolInit=el):er.push(ei={_start:eo,_end:eo,_level:es,_startsWithPDI:ec,_endsWithIsolInit:el})}}for(var eu=[],ed=0;ed<er.length;ed++){var ef=er[ed];if(!ef._startsWithPDI||ef._startsWithPDI&&!s.has(ef._start)){for(var ep=[ei=ef],eh=void 0;ei&&ei._endsWithIsolInit&&null!=(eh=s.get(ei._end));)for(var ev=ed+1;ev<er.length;ev++)if(er[ev]._start===eh){ep.push(ei=er[ev]);break}for(var em=[],eg=0;eg<ep.length;eg++)for(var eb=ep[eg],ey=eb._start;ey<=eb._end;ey++)em.push(ey);for(var ew=a[em[0]],ex=v.level,eE=em[0]-1;eE>=0;eE--)if(!(n[eE]&d)){ex=a[eE];break}var e_=em[em.length-1],eS=a[e_],eM=v.level;if(!(n[e_]&l)){for(var eO=e_+1;eO<=v.end;eO++)if(!(n[eO]&d)){eM=a[eO];break}}eu.push({_seqIndices:em,_sosType:Math.max(ex,ew)%2?x:w,_eosType:Math.max(eM,eS)%2?x:w})}}for(var ej=0;ej<eu.length;ej++){var eA=eu[ej],eC=eA._seqIndices,eP=eA._sosType,eT=eA._eosType,eL=1&a[eC[0]]?x:w;if(i.get(T))for(var eD=0;eD<eC.length;eD++){var eR=eC[eD];if(n[eR]&T){for(var ek=eP,eI=eD-1;eI>=0;eI--)if(!(n[eC[eI]]&d)){ek=n[eC[eI]];break}o(eR,ek&(l|B)?C:ek)}}if(i.get(E))for(var ez=0;ez<eC.length;ez++){var eU=eC[ez];if(n[eU]&E)for(var eF=ez-1;eF>=-1;eF--){var eN=-1===eF?eP:n[eC[eF]];if(eN&c){eN===L&&o(eU,M);break}}}if(i.get(L))for(var eB=0;eB<eC.length;eB++){var eH=eC[eB];n[eH]&L&&o(eH,x)}if(i.get(_)||i.get(O))for(var eq=1;eq<eC.length-1;eq++){var eY=eC[eq];if(n[eY]&(_|O)){for(var eG=0,eW=0,eX=eq-1;eX>=0&&(eG=n[eC[eX]])&d;eX--);for(var eK=eq+1;eK<eC.length&&(eW=n[eC[eK]])&d;eK++);eG===eW&&(n[eY]===_?eG===E:eG&(E|M))&&o(eY,eG)}}if(i.get(E)){for(var eV=0;eV<eC.length;eV++)if(n[eC[eV]]&E){for(var e$=eV-1;e$>=0&&n[eC[e$]]&(S|d);e$--)o(eC[e$],E);for(eV++;eV<eC.length&&n[eC[eV]]&(S|d|E);eV++)n[eC[eV]]!==E&&o(eC[eV],E)}}if(i.get(S)||i.get(_)||i.get(O))for(var eZ=0;eZ<eC.length;eZ++){var eQ=eC[eZ];if(n[eQ]&(S|_|O)){o(eQ,C);for(var eJ=eZ-1;eJ>=0&&n[eC[eJ]]&d;eJ--)o(eC[eJ],C);for(var e0=eZ+1;e0<eC.length&&n[eC[e0]]&d;e0++)o(eC[e0],C)}}if(i.get(E))for(var e1=0,e2=eP;e1<eC.length;e1++){var e3=eC[e1],e4=n[e3];e4&E?e2===w&&o(e3,w):e4&c&&(e2=e4)}if(i.get(u)){for(var e5=x|E|M,e6=e5|w,e7=[],e9=[],e8=0;e8<eC.length;e8++)if(n[eC[e8]]&u){var te=e[eC[e8]],tt=void 0;if(null!==g(te))if(e9.length<63)e9.push({char:te,seqIndex:e8});else break;else if(null!==(tt=b(te)))for(var tn=e9.length-1;tn>=0;tn--){var tr=e9[tn].char;if(tr===tt||tr===b(y(te))||g(y(tr))===te){e7.push([e9[tn].seqIndex,e8]),e9.length=tn;break}}}e7.sort(function(e,t){return e[0]-t[0]});for(var ti=0;ti<e7.length;ti++){for(var to=e7[ti],ta=to[0],ts=to[1],tl=!1,tc=0,tu=ta+1;tu<ts;tu++){var td=eC[tu];if(n[td]&e6){tl=!0;var tf=n[td]&e5?x:w;if(tf===eL){tc=tf;break}}}if(tl&&!tc){tc=eP;for(var tp=ta-1;tp>=0;tp--){var th=eC[tp];if(n[th]&e6){var tv=n[th]&e5?x:w;tc=tv!==eL?tv:eL;break}}}if(tc){if(n[eC[ta]]=n[eC[ts]]=tc,tc!==eL){for(var tm=ta+1;tm<eC.length;tm++)if(!(n[eC[tm]]&d)){h(e[eC[tm]])&T&&(n[eC[tm]]=tc);break}}if(tc!==eL){for(var tg=ts+1;tg<eC.length;tg++)if(!(n[eC[tg]]&d)){h(e[eC[tg]])&T&&(n[eC[tg]]=tc);break}}}}for(var tb=0;tb<eC.length;tb++)if(n[eC[tb]]&u){for(var ty=tb,tw=tb,tx=eP,tE=tb-1;tE>=0;tE--)if(n[eC[tE]]&d)ty=tE;else{tx=n[eC[tE]]&e5?x:w;break}for(var t_=eT,tS=tb+1;tS<eC.length;tS++)if(n[eC[tS]]&(u|d))tw=tS;else{t_=n[eC[tS]]&e5?x:w;break}for(var tM=ty;tM<=tw;tM++)n[eC[tM]]=tx===t_?tx:eL;tb=tw}}}for(var tO=v.start;tO<=v.end;tO++){var tj=a[tO],tA=n[tO];if(1&tj?tA&(w|E|M)&&a[tO]++:tA&x?a[tO]++:tA&(M|E)&&(a[tO]+=2),tA&d&&(a[tO]=0===tO?v.level:a[tO-1]),tO===v.end||h(e[tO])&(A|j))for(var tC=tO;tC>=0&&h(e[tC])&f;tC--)a[tC]=v.level}}return{levels:a,paragraphs:p};function tP(t,r){for(var i=t;i<e.length;i++){var o=n[i];if(o&(x|L))return 1;if(o&(j|w)||r&&o===B)break;if(o&l){var a=function(t){for(var r=1,i=t+1;i<e.length;i++){var o=n[i];if(o&j)break;if(o&B){if(0==--r)return i}else o&l&&r++}return -1}(i);i=-1===a?e.length:a}}return 0}},e.getMirroredCharacter=H,e.getMirroredCharactersMap=function(e,t,n,r){var i=e.length;n=Math.max(0,null==n?0:+n),r=Math.min(i-1,null==r?i-1:+r);for(var o=new Map,a=n;a<=r;a++)if(1&t[a]){var s=H(e[a]);null!==s&&o.set(a,s)}return o},e.getReorderSegments=q,e.getReorderedIndices=Y,e.getReorderedString=function(e,t,n,r){var i=Y(e,t,n,r),o=[].concat(e);return i.forEach(function(n,r){o[r]=(1&t.levels[n]?H(e[n]):null)||e[n]}),o.join("")},e.openingToClosingBracket=g,Object.defineProperty(e,"__esModule",{value:!0}),e}({})}},6935:(e,t,n)=>{n.d(t,{DY:()=>a,IU:()=>l,uv:()=>s});let r=[];function i(e,t,n=(e,t)=>e===t){if(e===t)return!0;if(!e||!t)return!1;let r=e.length;if(t.length!==r)return!1;for(let i=0;i<r;i++)if(!n(e[i],t[i]))return!1;return!0}function o(e,t=null,n=!1,a={}){for(let o of(null===t&&(t=[e]),r))if(i(t,o.keys,o.equal)){if(n)return;if(Object.prototype.hasOwnProperty.call(o,"error"))throw o.error;if(Object.prototype.hasOwnProperty.call(o,"response"))return a.lifespan&&a.lifespan>0&&(o.timeout&&clearTimeout(o.timeout),o.timeout=setTimeout(o.remove,a.lifespan)),o.response;if(!n)throw o.promise}let s={keys:t,equal:a.equal,remove:()=>{let e=r.indexOf(s);-1!==e&&r.splice(e,1)},promise:("object"==typeof e&&"function"==typeof e.then?e:e(...t)).then(e=>{s.response=e,a.lifespan&&a.lifespan>0&&(s.timeout=setTimeout(s.remove,a.lifespan))}).catch(e=>s.error=e)};if(r.push(s),!n)throw s.promise}let a=(e,t,n)=>o(e,t,!1,n),s=(e,t,n)=>void o(e,t,!0,n),l=e=>{if(void 0===e||0===e.length)r.splice(0,r.length);else{let t=r.find(t=>i(e,t.keys,t.equal));t&&t.remove()}}},7117:(e,t,n)=>{var r=n(4364),i="function"==typeof Object.is?Object.is:function(e,t){return e===t&&(0!==e||1/e==1/t)||e!=e&&t!=t},o=r.useState,a=r.useEffect,s=r.useLayoutEffect,l=r.useDebugValue;function c(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!i(e,n)}catch(e){return!0}}var u="undefined"==typeof window||void 0===window.document||void 0===window.document.createElement?function(e,t){return t()}:function(e,t){var n=t(),r=o({inst:{value:n,getSnapshot:t}}),i=r[0].inst,u=r[1];return s(function(){i.value=n,i.getSnapshot=t,c(i)&&u({inst:i})},[e,n,t]),a(function(){return c(i)&&u({inst:i}),e(function(){c(i)&&u({inst:i})})},[e]),l(n),n};t.useSyncExternalStore=void 0!==r.useSyncExternalStore?r.useSyncExternalStore:u},7235:(e,t)=>{function n(e,t){var n=e.length;for(e.push(t);0<n;){var r=n-1>>>1,i=e[r];if(0<o(i,t))e[r]=t,e[n]=i,n=r;else break}}function r(e){return 0===e.length?null:e[0]}function i(e){if(0===e.length)return null;var t=e[0],n=e.pop();if(n!==t){e[0]=n;for(var r=0,i=e.length,a=i>>>1;r<a;){var s=2*(r+1)-1,l=e[s],c=s+1,u=e[c];if(0>o(l,n))c<i&&0>o(u,l)?(e[r]=u,e[c]=n,r=c):(e[r]=l,e[s]=n,r=s);else if(c<i&&0>o(u,n))e[r]=u,e[c]=n,r=c;else break}}return t}function o(e,t){var n=e.sortIndex-t.sortIndex;return 0!==n?n:e.id-t.id}if(t.unstable_now=void 0,"object"==typeof performance&&"function"==typeof performance.now){var a,s=performance;t.unstable_now=function(){return s.now()}}else{var l=Date,c=l.now();t.unstable_now=function(){return l.now()-c}}var u=[],d=[],f=1,p=null,h=3,v=!1,m=!1,g=!1,b="function"==typeof setTimeout?setTimeout:null,y="function"==typeof clearTimeout?clearTimeout:null,w="undefined"!=typeof setImmediate?setImmediate:null;function x(e){for(var t=r(d);null!==t;){if(null===t.callback)i(d);else if(t.startTime<=e)i(d),t.sortIndex=t.expirationTime,n(u,t);else break;t=r(d)}}function E(e){if(g=!1,x(e),!m)if(null!==r(u))m=!0,T();else{var t=r(d);null!==t&&L(E,t.startTime-e)}}var _=!1,S=-1,M=5,O=-1;function j(){return!(t.unstable_now()-O<M)}function A(){if(_){var e=t.unstable_now();O=e;var n=!0;try{e:{m=!1,g&&(g=!1,y(S),S=-1),v=!0;var o=h;try{t:{for(x(e),p=r(u);null!==p&&!(p.expirationTime>e&&j());){var s=p.callback;if("function"==typeof s){p.callback=null,h=p.priorityLevel;var l=s(p.expirationTime<=e);if(e=t.unstable_now(),"function"==typeof l){p.callback=l,x(e),n=!0;break t}p===r(u)&&i(u),x(e)}else i(u);p=r(u)}if(null!==p)n=!0;else{var c=r(d);null!==c&&L(E,c.startTime-e),n=!1}}break e}finally{p=null,h=o,v=!1}}}finally{n?a():_=!1}}}if("function"==typeof w)a=function(){w(A)};else if("undefined"!=typeof MessageChannel){var C=new MessageChannel,P=C.port2;C.port1.onmessage=A,a=function(){P.postMessage(null)}}else a=function(){b(A,0)};function T(){_||(_=!0,a())}function L(e,n){S=b(function(){e(t.unstable_now())},n)}t.unstable_IdlePriority=5,t.unstable_ImmediatePriority=1,t.unstable_LowPriority=4,t.unstable_NormalPriority=3,t.unstable_Profiling=null,t.unstable_UserBlockingPriority=2,t.unstable_cancelCallback=function(e){e.callback=null},t.unstable_continueExecution=function(){m||v||(m=!0,T())},t.unstable_forceFrameRate=function(e){0>e||125<e?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):M=0<e?Math.floor(1e3/e):5},t.unstable_getCurrentPriorityLevel=function(){return h},t.unstable_getFirstCallbackNode=function(){return r(u)},t.unstable_next=function(e){switch(h){case 1:case 2:case 3:var t=3;break;default:t=h}var n=h;h=t;try{return e()}finally{h=n}},t.unstable_pauseExecution=function(){},t.unstable_requestPaint=function(){},t.unstable_runWithPriority=function(e,t){switch(e){case 1:case 2:case 3:case 4:case 5:break;default:e=3}var n=h;h=e;try{return t()}finally{h=n}},t.unstable_scheduleCallback=function(e,i,o){var a=t.unstable_now();switch(o="object"==typeof o&&null!==o&&"number"==typeof(o=o.delay)&&0<o?a+o:a,e){case 1:var s=-1;break;case 2:s=250;break;case 5:s=0x3fffffff;break;case 4:s=1e4;break;default:s=5e3}return s=o+s,e={id:f++,callback:i,priorityLevel:e,startTime:o,expirationTime:s,sortIndex:-1},o>a?(e.sortIndex=o,n(d,e),null===r(u)&&e===r(d)&&(g?(y(S),S=-1):g=!0,L(E,o-a))):(e.sortIndex=s,n(u,e),m||v||(m=!0,T())),e},t.unstable_shouldYield=j,t.unstable_wrapCallback=function(e){var t=h;return function(){var n=h;h=t;try{return e.apply(this,arguments)}finally{h=n}}}},7795:(e,t,n)=>{n.d(t,{Af:()=>s,Nz:()=>i,u5:()=>l,y3:()=>d});var r=n(4364);function i(e,t,n){if(!e)return;if(!0===n(e))return e;let r=t?e.return:e.child;for(;r;){let e=i(r,t,n);if(e)return e;r=t?null:r.sibling}}function o(e){try{return Object.defineProperties(e,{_currentRenderer:{get:()=>null,set(){}},_currentRenderer2:{get:()=>null,set(){}}})}catch(t){return e}}(()=>{var e,t;return"undefined"!=typeof window&&((null==(e=window.document)?void 0:e.createElement)||(null==(t=window.navigator)?void 0:t.product)==="ReactNative")})()?r.useLayoutEffect:r.useEffect;let a=o(r.createContext(null));class s extends r.Component{render(){return r.createElement(a.Provider,{value:this._reactInternals},this.props.children)}}function l(){let e=r.useContext(a);if(null===e)throw Error("its-fine: useFiber must be called within a <FiberProvider />!");let t=r.useId();return r.useMemo(()=>{for(let n of[e,null==e?void 0:e.alternate]){if(!n)continue;let e=i(n,!1,e=>{let n=e.memoizedState;for(;n;){if(n.memoizedState===t)return!0;n=n.next}});if(e)return e}},[e,t])}let c=Symbol.for("react.context"),u=e=>null!==e&&"object"==typeof e&&"$$typeof"in e&&e.$$typeof===c;function d(){let e=function(){let e=l(),[t]=r.useState(()=>new Map);t.clear();let n=e;for(;n;){let e=n.type;u(e)&&e!==a&&!t.has(e)&&t.set(e,r.use(o(e))),n=n.return}return t}();return r.useMemo(()=>Array.from(e.keys()).reduce((t,n)=>i=>r.createElement(t,null,r.createElement(n.Provider,{...i,value:e.get(n)})),e=>r.createElement(s,{...e})),[e])}},7969:(e,t,n)=>{e.exports=n(1666)},8541:(e,t)=>{t.ConcurrentRoot=1,t.ContinuousEventPriority=8,t.DefaultEventPriority=32,t.DiscreteEventPriority=2},8700:(e,t,n)=>{e.exports=n(4086)}}]);