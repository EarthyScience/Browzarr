"use strict";(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[566],{122:(e,t,n)=>{let r,i;n.d(t,{b:()=>_});var o=n(5903),a=n(4382),s=n(2371);s.UniformsLib.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new o.I9Y(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}},s.ShaderLib.line={uniforms:o.LlO.merge([s.UniformsLib.common,s.UniformsLib.fog,s.UniformsLib.line]),vertexShader:`
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
		`};class l extends o.BKk{constructor(e){super({type:"LineMaterial",uniforms:o.LlO.clone(s.ShaderLib.line.uniforms),vertexShader:s.ShaderLib.line.vertexShader,fragmentShader:s.ShaderLib.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){!0===e!==this.dashed&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(!0===e!==this.alphaToCoverage&&(this.needsUpdate=!0),!0===e?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}}let c=new o.IUQ,u=new o.Pq0,f=new o.Pq0,d=new o.IUQ,p=new o.IUQ,h=new o.IUQ,v=new o.Pq0,m=new o.kn4,g=new o.cZY,b=new o.Pq0,y=new o.NRn,w=new o.iyt,x=new o.IUQ;function E(e,t,n){return x.set(0,0,-t,1).applyMatrix4(e.projectionMatrix),x.multiplyScalar(1/x.w),x.x=i/n.width,x.y=i/n.height,x.applyMatrix4(e.projectionMatrixInverse),x.multiplyScalar(1/x.w),Math.abs(Math.max(x.x,x.y))}class _ extends o.eaF{constructor(e=new a.n,t=new l({color:0xffffff*Math.random()})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,r=new Float32Array(2*t.count);for(let e=0,i=0,o=t.count;e<o;e++,i+=2)u.fromBufferAttribute(t,e),f.fromBufferAttribute(n,e),r[i]=0===i?0:r[i-1],r[i+1]=r[i]+u.distanceTo(f);let i=new o.LuO(r,2,1);return e.setAttribute("instanceDistanceStart",new o.eHs(i,1,0)),e.setAttribute("instanceDistanceEnd",new o.eHs(i,1,1)),this}raycast(e,t){let n,a,s=this.material.worldUnits,l=e.camera;null!==l||s||console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');let c=void 0!==e.params.Line2&&e.params.Line2.threshold||0;r=e.ray;let u=this.matrixWorld,f=this.geometry,x=this.material;if(i=x.linewidth+c,null===f.boundingSphere&&f.computeBoundingSphere(),w.copy(f.boundingSphere).applyMatrix4(u),s)n=.5*i;else{let e=Math.max(l.near,w.distanceToPoint(r.origin));n=E(l,e,x.resolution)}if(w.radius+=n,!1!==r.intersectsSphere(w)){if(null===f.boundingBox&&f.computeBoundingBox(),y.copy(f.boundingBox).applyMatrix4(u),s)a=.5*i;else{let e=Math.max(l.near,y.distanceToPoint(r.origin));a=E(l,e,x.resolution)}y.expandByScalar(a),!1!==r.intersectsBox(y)&&(s?function(e,t){let n=e.matrixWorld,a=e.geometry,s=a.attributes.instanceStart,l=a.attributes.instanceEnd,c=Math.min(a.instanceCount,s.count);for(let a=0;a<c;a++){g.start.fromBufferAttribute(s,a),g.end.fromBufferAttribute(l,a),g.applyMatrix4(n);let c=new o.Pq0,u=new o.Pq0;r.distanceSqToSegment(g.start,g.end,u,c),u.distanceTo(c)<.5*i&&t.push({point:u,pointOnLine:c,distance:r.origin.distanceTo(u),object:e,face:null,faceIndex:a,uv:null,uv1:null})}}(this,t):function(e,t,n){let a=t.projectionMatrix,s=e.material.resolution,l=e.matrixWorld,c=e.geometry,u=c.attributes.instanceStart,f=c.attributes.instanceEnd,y=Math.min(c.instanceCount,u.count),w=-t.near;r.at(1,h),h.w=1,h.applyMatrix4(t.matrixWorldInverse),h.applyMatrix4(a),h.multiplyScalar(1/h.w),h.x*=s.x/2,h.y*=s.y/2,h.z=0,v.copy(h),m.multiplyMatrices(t.matrixWorldInverse,l);for(let t=0;t<y;t++){if(d.fromBufferAttribute(u,t),p.fromBufferAttribute(f,t),d.w=1,p.w=1,d.applyMatrix4(m),p.applyMatrix4(m),d.z>w&&p.z>w)continue;if(d.z>w){let e=d.z-p.z,t=(d.z-w)/e;d.lerp(p,t)}else if(p.z>w){let e=p.z-d.z,t=(p.z-w)/e;p.lerp(d,t)}d.applyMatrix4(a),p.applyMatrix4(a),d.multiplyScalar(1/d.w),p.multiplyScalar(1/p.w),d.x*=s.x/2,d.y*=s.y/2,p.x*=s.x/2,p.y*=s.y/2,g.start.copy(d),g.start.z=0,g.end.copy(p),g.end.z=0;let c=g.closestPointToPointParameter(v,!0);g.at(c,b);let h=o.cj9.lerp(d.z,p.z,c),y=h>=-1&&h<=1,x=v.distanceTo(b)<.5*i;if(y&&x){g.start.fromBufferAttribute(u,t),g.end.fromBufferAttribute(f,t),g.start.applyMatrix4(l),g.end.applyMatrix4(l);let i=new o.Pq0,a=new o.Pq0;r.distanceSqToSegment(g.start,g.end,a,i),n.push({point:a,pointOnLine:i,distance:r.origin.distanceTo(a),object:e,face:null,faceIndex:t,uv:null,uv1:null})}}}(this,l,t))}}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(c),this.material.uniforms.resolution.value.set(c.z,c.w))}}},160:(e,t)=>{function n(e,t){var n=e.length;for(e.push(t);0<n;){var r=n-1>>>1,i=e[r];if(0<o(i,t))e[r]=t,e[n]=i,n=r;else break}}function r(e){return 0===e.length?null:e[0]}function i(e){if(0===e.length)return null;var t=e[0],n=e.pop();if(n!==t){e[0]=n;for(var r=0,i=e.length,a=i>>>1;r<a;){var s=2*(r+1)-1,l=e[s],c=s+1,u=e[c];if(0>o(l,n))c<i&&0>o(u,l)?(e[r]=u,e[c]=n,r=c):(e[r]=l,e[s]=n,r=s);else if(c<i&&0>o(u,n))e[r]=u,e[c]=n,r=c;else break}}return t}function o(e,t){var n=e.sortIndex-t.sortIndex;return 0!==n?n:e.id-t.id}if(t.unstable_now=void 0,"object"==typeof performance&&"function"==typeof performance.now){var a,s=performance;t.unstable_now=function(){return s.now()}}else{var l=Date,c=l.now();t.unstable_now=function(){return l.now()-c}}var u=[],f=[],d=1,p=null,h=3,v=!1,m=!1,g=!1,b=!1,y="function"==typeof setTimeout?setTimeout:null,w="function"==typeof clearTimeout?clearTimeout:null,x="undefined"!=typeof setImmediate?setImmediate:null;function E(e){for(var t=r(f);null!==t;){if(null===t.callback)i(f);else if(t.startTime<=e)i(f),t.sortIndex=t.expirationTime,n(u,t);else break;t=r(f)}}function _(e){if(g=!1,E(e),!m)if(null!==r(u))m=!0,S||(S=!0,a());else{var t=r(f);null!==t&&C(_,t.startTime-e)}}var S=!1,M=-1,A=5,O=-1;function L(){return!!b||!(t.unstable_now()-O<A)}function T(){if(b=!1,S){var e=t.unstable_now();O=e;var n=!0;try{e:{m=!1,g&&(g=!1,w(M),M=-1),v=!0;var o=h;try{t:{for(E(e),p=r(u);null!==p&&!(p.expirationTime>e&&L());){var s=p.callback;if("function"==typeof s){p.callback=null,h=p.priorityLevel;var l=s(p.expirationTime<=e);if(e=t.unstable_now(),"function"==typeof l){p.callback=l,E(e),n=!0;break t}p===r(u)&&i(u),E(e)}else i(u);p=r(u)}if(null!==p)n=!0;else{var c=r(f);null!==c&&C(_,c.startTime-e),n=!1}}break e}finally{p=null,h=o,v=!1}}}finally{n?a():S=!1}}}if("function"==typeof x)a=function(){x(T)};else if("undefined"!=typeof MessageChannel){var P=new MessageChannel,D=P.port2;P.port1.onmessage=T,a=function(){D.postMessage(null)}}else a=function(){y(T,0)};function C(e,n){M=y(function(){e(t.unstable_now())},n)}t.unstable_IdlePriority=5,t.unstable_ImmediatePriority=1,t.unstable_LowPriority=4,t.unstable_NormalPriority=3,t.unstable_Profiling=null,t.unstable_UserBlockingPriority=2,t.unstable_cancelCallback=function(e){e.callback=null},t.unstable_forceFrameRate=function(e){0>e||125<e?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):A=0<e?Math.floor(1e3/e):5},t.unstable_getCurrentPriorityLevel=function(){return h},t.unstable_next=function(e){switch(h){case 1:case 2:case 3:var t=3;break;default:t=h}var n=h;h=t;try{return e()}finally{h=n}},t.unstable_requestPaint=function(){b=!0},t.unstable_runWithPriority=function(e,t){switch(e){case 1:case 2:case 3:case 4:case 5:break;default:e=3}var n=h;h=e;try{return t()}finally{h=n}},t.unstable_scheduleCallback=function(e,i,o){var s=t.unstable_now();switch(o="object"==typeof o&&null!==o&&"number"==typeof(o=o.delay)&&0<o?s+o:s,e){case 1:var l=-1;break;case 2:l=250;break;case 5:l=0x3fffffff;break;case 4:l=1e4;break;default:l=5e3}return l=o+l,e={id:d++,callback:i,priorityLevel:e,startTime:o,expirationTime:l,sortIndex:-1},o>s?(e.sortIndex=o,n(f,e),null===r(u)&&e===r(f)&&(g?(w(M),M=-1):g=!0,C(_,o-s))):(e.sortIndex=l,n(u,e),m||v||(m=!0,S||(S=!0,a()))),e},t.unstable_shouldYield=L,t.unstable_wrapCallback=function(e){var t=h;return function(){var n=h;h=t;try{return e.apply(this,arguments)}finally{h=n}}}},1018:(e,t,n)=>{n.d(t,{E:()=>l});var r=n(3933),i=n(4908),o=n(7697),a=n(1671),s=n(4426);let l=i.forwardRef(({sdfGlyphSize:e=64,anchorX:t="center",anchorY:n="middle",font:l,fontSize:c=1,children:u,characters:f,onSync:d,...p},h)=>{let v=(0,a.D)(({invalidate:e})=>e),[m]=i.useState(()=>new o.EY),[g,b]=i.useMemo(()=>{let e=[],t="";return i.Children.forEach(u,n=>{"string"==typeof n||"number"==typeof n?t+=n:e.push(n)}),[e,t]},[u]);return(0,s.DY)(()=>new Promise(e=>(0,o.PY)({font:l,characters:f},e)),["troika-text",l,f]),i.useLayoutEffect(()=>void m.sync(()=>{v(),d&&d(m)})),i.useEffect(()=>()=>m.dispose(),[m]),i.createElement("primitive",(0,r.A)({object:m,ref:h,font:l,text:b,anchorX:t,anchorY:n,fontSize:c,sdfGlyphSize:e},p),g)})},1136:(e,t,n)=>{n.d(t,{Hl:()=>f});var r=n(1671),i=n(4908),o=n(2371);function a(e,t){let n;return(...r)=>{window.clearTimeout(n),n=window.setTimeout(()=>e(...r),t)}}let s=["x","y","top","bottom","left","right","width","height"];var l=n(7488),c=n(3312);function u({ref:e,children:t,fallback:n,resize:l,style:u,gl:f,events:d=r.f,eventSource:p,eventPrefix:h,shadows:v,linear:m,flat:g,legacy:b,orthographic:y,frameloop:w,dpr:x,performance:E,raycaster:_,camera:S,scene:M,onPointerMissed:A,onCreated:O,...L}){i.useMemo(()=>(0,r.e)(o),[]);let T=(0,r.u)(),[P,D]=function({debounce:e,scroll:t,polyfill:n,offsetSize:r}={debounce:0,scroll:!1,offsetSize:!1}){var o,l,c;let u=n||("undefined"==typeof window?class{}:window.ResizeObserver);if(!u)throw Error("This browser does not support ResizeObserver out of the box. See: https://github.com/react-spring/react-use-measure/#resize-observer-polyfills");let[f,d]=(0,i.useState)({left:0,top:0,width:0,height:0,bottom:0,right:0,x:0,y:0}),p=(0,i.useRef)({element:null,scrollContainers:null,resizeObserver:null,lastBounds:f,orientationHandler:null}),h=e?"number"==typeof e?e:e.scroll:null,v=e?"number"==typeof e?e:e.resize:null,m=(0,i.useRef)(!1);(0,i.useEffect)(()=>(m.current=!0,()=>void(m.current=!1)));let[g,b,y]=(0,i.useMemo)(()=>{let e=()=>{let e,t;if(!p.current.element)return;let{left:n,top:i,width:o,height:a,bottom:l,right:c,x:u,y:f}=p.current.element.getBoundingClientRect(),h={left:n,top:i,width:o,height:a,bottom:l,right:c,x:u,y:f};p.current.element instanceof HTMLElement&&r&&(h.height=p.current.element.offsetHeight,h.width=p.current.element.offsetWidth),Object.freeze(h),m.current&&(e=p.current.lastBounds,t=h,!s.every(n=>e[n]===t[n]))&&d(p.current.lastBounds=h)};return[e,v?a(e,v):e,h?a(e,h):e]},[d,r,h,v]);function w(){p.current.scrollContainers&&(p.current.scrollContainers.forEach(e=>e.removeEventListener("scroll",y,!0)),p.current.scrollContainers=null),p.current.resizeObserver&&(p.current.resizeObserver.disconnect(),p.current.resizeObserver=null),p.current.orientationHandler&&("orientation"in screen&&"removeEventListener"in screen.orientation?screen.orientation.removeEventListener("change",p.current.orientationHandler):"onorientationchange"in window&&window.removeEventListener("orientationchange",p.current.orientationHandler))}function x(){p.current.element&&(p.current.resizeObserver=new u(y),p.current.resizeObserver.observe(p.current.element),t&&p.current.scrollContainers&&p.current.scrollContainers.forEach(e=>e.addEventListener("scroll",y,{capture:!0,passive:!0})),p.current.orientationHandler=()=>{y()},"orientation"in screen&&"addEventListener"in screen.orientation?screen.orientation.addEventListener("change",p.current.orientationHandler):"onorientationchange"in window&&window.addEventListener("orientationchange",p.current.orientationHandler))}return o=y,l=!!t,(0,i.useEffect)(()=>{if(l)return window.addEventListener("scroll",o,{capture:!0,passive:!0}),()=>void window.removeEventListener("scroll",o,!0)},[o,l]),c=b,(0,i.useEffect)(()=>(window.addEventListener("resize",c),()=>void window.removeEventListener("resize",c)),[c]),(0,i.useEffect)(()=>{w(),x()},[t,y,b]),(0,i.useEffect)(()=>w,[]),[e=>{e&&e!==p.current.element&&(w(),p.current.element=e,p.current.scrollContainers=function e(t){let n=[];if(!t||t===document.body)return n;let{overflow:r,overflowX:i,overflowY:o}=window.getComputedStyle(t);return[r,i,o].some(e=>"auto"===e||"scroll"===e)&&n.push(t),[...n,...e(t.parentElement)]}(e),x())},f,g]}({scroll:!0,debounce:{scroll:50,resize:0},...l}),C=i.useRef(null),R=i.useRef(null);i.useImperativeHandle(e,()=>C.current);let k=(0,r.a)(A),I=i.useCallback(e=>null==k.current?void 0:k.current(e),[k]),[j,z]=i.useState(!1),[U,B]=i.useState(!1);if(j)throw j;if(U)throw U;let F=i.useRef(null),[N,Y]=(0,r.b)(),H=i.useRef(null),q=()=>p?(0,r.i)(p)?p.current:p:R.current;i.useInsertionEffect(()=>()=>{let e=F.current;F.current=null,null==e||e.unmount()},[]),(0,r.c)(()=>{let e=C.current;D.width>0&&D.height>0&&e&&(F.current||(F.current=(0,r.d)(e)),F.current.configure({gl:f,scene:M,events:d,shadows:v,linear:m,flat:g,legacy:b,orthographic:y,frameloop:w,dpr:x,performance:E,raycaster:_,camera:S,size:D,onPointerMissed:I,onCreated:e=>{var t;H.current=e,null==e.events.connect||e.events.connect(null!=(t=q())?t:R.current),h&&e.setEvents({compute:(e,t)=>{let n=e[h+"X"],r=e[h+"Y"];t.pointer.set(n/t.size.width*2-1,-(2*(r/t.size.height))+1),t.raycaster.setFromCamera(t.pointer,t.camera)}}),null==O||O(e)}}).catch(B),"fulfilled"===F.current.ready.status?F.current.render((0,c.jsx)(T,{children:(0,c.jsx)(r.E,{set:B,children:(0,c.jsx)(i.Suspense,{fallback:(0,c.jsx)(r.B,{set:z}),children:null!=t?t:null})})})):"pending"===F.current.ready.status&&Y(F.current.ready))}),i.useEffect(()=>{var e;let t=null==(e=H.current)?void 0:e.get(),n=q();t&&n&&t.events.connected!==n&&(null==t.events.connect||t.events.connect(n))}),i.useEffect(()=>{let e=C.current;return()=>{var t;e.isConnected||null==(t=F.current)||t.unmount()}},[]);let G=p?"none":"auto";return(0,c.jsxs)("div",{ref:R,style:{position:"relative",width:"100%",height:"100%",overflow:"hidden",pointerEvents:G,...u},...L,children:[(0,c.jsx)("div",{ref:P,style:{width:"100%",height:"100%"},children:(0,c.jsx)("canvas",{ref:C,style:{display:"block"},children:n})}),N]})}function f(e){return(0,c.jsx)(l.Af,{children:(0,c.jsx)(u,{...e})})}n(6963)},1600:(e,t,n)=>{e.exports=n(3655)},1825:(e,t,n)=>{n.d(t,{A:()=>r});function r(){return function(e){var t,n,r,i,o={R:"13k,1a,2,3,3,2+1j,ch+16,a+1,5+2,2+n,5,a,4,6+16,4+3,h+1b,4mo,179q,2+9,2+11,2i9+7y,2+68,4,3+4,5+13,4+3,2+4k,3+29,8+cf,1t+7z,w+17,3+3m,1t+3z,16o1+5r,8+30,8+mc,29+1r,29+4v,75+73",EN:"1c+9,3d+1,6,187+9,513,4+5,7+9,sf+j,175h+9,qw+q,161f+1d,4xt+a,25i+9",ES:"17,2,6dp+1,f+1,av,16vr,mx+1,4o,2",ET:"z+2,3h+3,b+1,ym,3e+1,2o,p4+1,8,6u,7c,g6,1wc,1n9+4,30+1b,2n,6d,qhx+1,h0m,a+1,49+2,63+1,4+1,6bb+3,12jj",AN:"16o+5,2j+9,2+1,35,ed,1ff2+9,87+u",CS:"18,2+1,b,2u,12k,55v,l,17v0,2,3,53,2+1,b",B:"a,3,f+2,2v,690",S:"9,2,k",WS:"c,k,4f4,1vk+a,u,1j,335",ON:"x+1,4+4,h+5,r+5,r+3,z,5+3,2+1,2+1,5,2+2,3+4,o,w,ci+1,8+d,3+d,6+8,2+g,39+1,9,6+1,2,33,b8,3+1,3c+1,7+1,5r,b,7h+3,sa+5,2,3i+6,jg+3,ur+9,2v,ij+1,9g+9,7+a,8m,4+1,49+x,14u,2+2,c+2,e+2,e+2,e+1,i+n,e+e,2+p,u+2,e+2,36+1,2+3,2+1,b,2+2,6+5,2,2,2,h+1,5+4,6+3,3+f,16+2,5+3l,3+81,1y+p,2+40,q+a,m+13,2r+ch,2+9e,75+hf,3+v,2+2w,6e+5,f+6,75+2a,1a+p,2+2g,d+5x,r+b,6+3,4+o,g,6+1,6+2,2k+1,4,2j,5h+z,1m+1,1e+f,t+2,1f+e,d+3,4o+3,2s+1,w,535+1r,h3l+1i,93+2,2s,b+1,3l+x,2v,4g+3,21+3,kz+1,g5v+1,5a,j+9,n+v,2,3,2+8,2+1,3+2,2,3,46+1,4+4,h+5,r+5,r+a,3h+2,4+6,b+4,78,1r+24,4+c,4,1hb,ey+6,103+j,16j+c,1ux+7,5+g,fsh,jdq+1t,4,57+2e,p1,1m,1m,1m,1m,4kt+1,7j+17,5+2r,d+e,3+e,2+e,2+10,m+4,w,1n+5,1q,4z+5,4b+rb,9+c,4+c,4+37,d+2g,8+b,l+b,5+1j,9+9,7+13,9+t,3+1,27+3c,2+29,2+3q,d+d,3+4,4+2,6+6,a+o,8+6,a+2,e+6,16+42,2+1i",BN:"0+8,6+d,2s+5,2+p,e,4m9,1kt+2,2b+5,5+5,17q9+v,7k,6p+8,6+1,119d+3,440+7,96s+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+1,1ekf+75,6p+2rz,1ben+1,1ekf+1,1ekf+1",NSM:"lc+33,7o+6,7c+18,2,2+1,2+1,2,21+a,1d+k,h,2u+6,3+5,3+1,2+3,10,v+q,2k+a,1n+8,a,p+3,2+8,2+2,2+4,18+2,3c+e,2+v,1k,2,5+7,5,4+6,b+1,u,1n,5+3,9,l+1,r,3+1,1m,5+1,5+1,3+2,4,v+1,4,c+1,1m,5+4,2+1,5,l+1,n+5,2,1n,3,2+3,9,8+1,c+1,v,1q,d,1f,4,1m+2,6+2,2+3,8+1,c+1,u,1n,g+1,l+1,t+1,1m+1,5+3,9,l+1,u,21,8+2,2,2j,3+6,d+7,2r,3+8,c+5,23+1,s,2,2,1k+d,2+4,2+1,6+a,2+z,a,2v+3,2+5,2+1,3+1,q+1,5+2,h+3,e,3+1,7,g,jk+2,qb+2,u+2,u+1,v+1,1t+1,2+6,9,3+a,a,1a+2,3c+1,z,3b+2,5+1,a,7+2,64+1,3,1n,2+6,2,2,3+7,7+9,3,1d+g,1s+3,1d,2+4,2,6,15+8,d+1,x+3,3+1,2+2,1l,2+1,4,2+2,1n+7,3+1,49+2,2+c,2+6,5,7,4+1,5j+1l,2+4,k1+w,2db+2,3y,2p+v,ff+3,30+1,n9x+3,2+9,x+1,29+1,7l,4,5,q+1,6,48+1,r+h,e,13+7,q+a,1b+2,1d,3+3,3+1,14,1w+5,3+1,3+1,d,9,1c,1g,2+2,3+1,6+1,2,17+1,9,6n,3,5,fn5,ki+f,h+f,r2,6b,46+4,1af+2,2+1,6+3,15+2,5,4m+1,fy+3,as+1,4a+a,4x,1j+e,1l+2,1e+3,3+1,1y+2,11+4,2+7,1r,d+1,1h+8,b+3,3,2o+2,3,2+1,7,4h,4+7,m+1,1m+1,4,12+6,4+4,5g+7,3+2,2,o,2d+5,2,5+1,2+1,6n+3,7+1,2+1,s+1,2e+7,3,2+1,2z,2,3+5,2,2u+2,3+3,2+4,78+8,2+1,75+1,2,5,41+3,3+1,5,x+5,3+1,15+5,3+3,9,a+5,3+2,1b+c,2+1,bb+6,2+5,2d+l,3+6,2+1,2+1,3f+5,4,2+1,2+6,2,21+1,4,2,9o+1,f0c+4,1o+6,t5,1s+3,2a,f5l+1,43t+2,i+7,3+6,v+3,45+2,1j0+1i,5+1d,9,f,n+4,2+e,11t+6,2+g,3+6,2+1,2+4,7a+6,c6+3,15t+6,32+6,gzhy+6n",AL:"16w,3,2,e+1b,z+2,2+2s,g+1,8+1,b+m,2+t,s+2i,c+e,4h+f,1d+1e,1bwe+dp,3+3z,x+c,2+1,35+3y,2rm+z,5+7,b+5,dt+l,c+u,17nl+27,1t+27,4x+6n,3+d",LRO:"6ct",RLO:"6cu",LRE:"6cq",RLE:"6cr",PDF:"6cs",LRI:"6ee",RLI:"6ef",FSI:"6eg",PDI:"6eh"},a={},s={};a.L=1,s[1]="L",Object.keys(o).forEach(function(e,t){a[e]=1<<t+1,s[a[e]]=e}),Object.freeze(a);var l=a.LRI|a.RLI|a.FSI,c=a.L|a.R|a.AL,u=a.B|a.S|a.WS|a.ON|a.FSI|a.LRI|a.RLI|a.PDI,f=a.BN|a.RLE|a.LRE|a.RLO|a.LRO|a.PDF,d=a.S|a.WS|a.B|l|a.PDI|f,p=null;function h(e){return!function(){if(!p){p=new Map;var e=0;for(var t in o)if(o.hasOwnProperty(t))for(var n=o[t],r="",i=void 0,s=!1,l=0,c=0;c<=n.length+1;c+=1){var u=n[c];if(","!==u&&c!==n.length)"+"===u?(s=!0,l=e=l+parseInt(r,36),r=""):r+=u;else{s?i=e+parseInt(r,36):(l=e=l+parseInt(r,36),i=e),s=!1,r="",l=i;for(var f=e;f<i+1;f+=1)p.set(f,a[t])}}}}(),p.get(e.codePointAt(0))||a.L}function v(e,t){var n,r=0,i=new Map,o=t&&new Map;return e.split(",").forEach(function e(a){if(-1!==a.indexOf("+"))for(var s=+a;s--;)e(n);else{n=a;var l=a.split(">"),c=l[0],u=l[1];c=String.fromCodePoint(r+=parseInt(c,36)),u=String.fromCodePoint(r+=parseInt(u,36)),i.set(c,u),t&&o.set(u,c)}}),{map:i,reverseMap:o}}function m(){if(!t){var e=v("14>1,1e>2,u>2,2wt>1,1>1,1ge>1,1wp>1,1j>1,f>1,hm>1,1>1,u>1,u6>1,1>1,+5,28>1,w>1,1>1,+3,b8>1,1>1,+3,1>3,-1>-1,3>1,1>1,+2,1s>1,1>1,x>1,th>1,1>1,+2,db>1,1>1,+3,3>1,1>1,+2,14qm>1,1>1,+1,4q>1,1e>2,u>2,2>1,+1",!0),i=e.map,o=e.reverseMap;t=i,n=o,r=v("6f1>-6dx,6dy>-6dx,6ec>-6ed,6ee>-6ed,6ww>2jj,-2ji>2jj,14r4>-1e7l,1e7m>-1e7l,1e7m>-1e5c,1e5d>-1e5b,1e5c>-14qx,14qy>-14qx,14vn>-1ecg,1ech>-1ecg,1edu>-1ecg,1eci>-1ecg,1eda>-1ecg,1eci>-1ecg,1eci>-168q,168r>-168q,168s>-14ye,14yf>-14ye",!1).map}}function g(e){return m(),t.get(e)||null}function b(e){return m(),n.get(e)||null}function y(e){return m(),r.get(e)||null}var w=a.L,x=a.R,E=a.EN,_=a.ES,S=a.ET,M=a.AN,A=a.CS,O=a.B,L=a.S,T=a.ON,P=a.BN,D=a.NSM,C=a.AL,R=a.LRO,k=a.RLO,I=a.LRE,j=a.RLE,z=a.PDF,U=a.LRI,B=a.RLI,F=a.FSI,N=a.PDI;function Y(e){if(!i){var t=v("14>1,j>2,t>2,u>2,1a>g,2v3>1,1>1,1ge>1,1wd>1,b>1,1j>1,f>1,ai>3,-2>3,+1,8>1k0,-1jq>1y7,-1y6>1hf,-1he>1h6,-1h5>1ha,-1h8>1qi,-1pu>1,6>3u,-3s>7,6>1,1>1,f>1,1>1,+2,3>1,1>1,+13,4>1,1>1,6>1eo,-1ee>1,3>1mg,-1me>1mk,-1mj>1mi,-1mg>1mi,-1md>1,1>1,+2,1>10k,-103>1,1>1,4>1,5>1,1>1,+10,3>1,1>8,-7>8,+1,-6>7,+1,a>1,1>1,u>1,u6>1,1>1,+5,26>1,1>1,2>1,2>2,8>1,7>1,4>1,1>1,+5,b8>1,1>1,+3,1>3,-2>1,2>1,1>1,+2,c>1,3>1,1>1,+2,h>1,3>1,a>1,1>1,2>1,3>1,1>1,d>1,f>1,3>1,1a>1,1>1,6>1,7>1,13>1,k>1,1>1,+19,4>1,1>1,+2,2>1,1>1,+18,m>1,a>1,1>1,lk>1,1>1,4>1,2>1,f>1,3>1,1>1,+3,db>1,1>1,+3,3>1,1>1,+2,14qm>1,1>1,+1,6>1,4j>1,j>2,t>2,u>2,2>1,+1",!0),n=t.map;t.reverseMap.forEach(function(e,t){n.set(t,e)}),i=n}return i.get(e)||null}function H(e,t,n,r){var i=e.length;n=Math.max(0,null==n?0:+n),r=Math.min(i-1,null==r?i-1:+r);var o=[];return t.paragraphs.forEach(function(i){var a=Math.max(n,i.start),s=Math.min(r,i.end);if(a<s){for(var l=t.levels.slice(a,s+1),c=s;c>=a&&h(e[c])&d;c--)l[c]=i.level;for(var u=i.level,f=1/0,p=0;p<l.length;p++){var v=l[p];v>u&&(u=v),v<f&&(f=1|v)}for(var m=u;m>=f;m--)for(var g=0;g<l.length;g++)if(l[g]>=m){for(var b=g;g+1<l.length&&l[g+1]>=m;)g++;g>b&&o.push([b+a,g+a])}}}),o}function q(e,t,n,r){for(var i=H(e,t,n,r),o=[],a=0;a<e.length;a++)o[a]=a;return i.forEach(function(e){for(var t=e[0],n=e[1],r=o.slice(t,n+1),i=r.length;i--;)o[n-i]=r[i]}),o}return e.closingToOpeningBracket=b,e.getBidiCharType=h,e.getBidiCharTypeName=function(e){return s[h(e)]},e.getCanonicalBracket=y,e.getEmbeddingLevels=function(e,t){for(var n=new Uint32Array(e.length),r=0;r<e.length;r++)n[r]=h(e[r]);var i=new Map;function o(e,t){var r=n[e];n[e]=t,i.set(r,i.get(r)-1),r&u&&i.set(u,i.get(u)-1),i.set(t,(i.get(t)||0)+1),t&u&&i.set(u,(i.get(u)||0)+1)}for(var a=new Uint8Array(e.length),s=new Map,p=[],v=null,m=0;m<e.length;m++)v||p.push(v={start:m,end:e.length-1,level:"rtl"===t?1:"ltr"===t?0:tP(m,!1)}),n[m]&O&&(v.end=m,v=null);for(var Y=j|I|k|R|l|N|z|O,H=function(e){return e+(1&e?1:2)},q=function(e){return e+(1&e?2:1)},G=0;G<p.length;G++){var W=[{_level:(v=p[G]).level,_override:0,_isolate:0}],X=void 0,V=0,K=0,$=0;i.clear();for(var Z=v.start;Z<=v.end;Z++){var Q=n[Z];if(X=W[W.length-1],i.set(Q,(i.get(Q)||0)+1),Q&u&&i.set(u,(i.get(u)||0)+1),Q&Y)if(Q&(j|I)){a[Z]=X._level;var J=(Q===j?q:H)(X._level);!(J<=125)||V||K?!V&&K++:W.push({_level:J,_override:0,_isolate:0})}else if(Q&(k|R)){a[Z]=X._level;var ee=(Q===k?q:H)(X._level);!(ee<=125)||V||K?!V&&K++:W.push({_level:ee,_override:Q&k?x:w,_isolate:0})}else if(Q&l){Q&F&&(Q=1===tP(Z+1,!0)?B:U),a[Z]=X._level,X._override&&o(Z,X._override);var et=(Q===B?q:H)(X._level);et<=125&&0===V&&0===K?($++,W.push({_level:et,_override:0,_isolate:1,_isolInitIndex:Z})):V++}else if(Q&N){if(V>0)V--;else if($>0){for(K=0;!W[W.length-1]._isolate;)W.pop();var en=W[W.length-1]._isolInitIndex;null!=en&&(s.set(en,Z),s.set(Z,en)),W.pop(),$--}X=W[W.length-1],a[Z]=X._level,X._override&&o(Z,X._override)}else Q&z?(0===V&&(K>0?K--:!X._isolate&&W.length>1&&(W.pop(),X=W[W.length-1])),a[Z]=X._level):Q&O&&(a[Z]=v.level);else a[Z]=X._level,X._override&&Q!==P&&o(Z,X._override)}for(var er=[],ei=null,eo=v.start;eo<=v.end;eo++){var ea=n[eo];if(!(ea&f)){var es=a[eo],el=ea&l,ec=ea===N;ei&&es===ei._level?(ei._end=eo,ei._endsWithIsolInit=el):er.push(ei={_start:eo,_end:eo,_level:es,_startsWithPDI:ec,_endsWithIsolInit:el})}}for(var eu=[],ef=0;ef<er.length;ef++){var ed=er[ef];if(!ed._startsWithPDI||ed._startsWithPDI&&!s.has(ed._start)){for(var ep=[ei=ed],eh=void 0;ei&&ei._endsWithIsolInit&&null!=(eh=s.get(ei._end));)for(var ev=ef+1;ev<er.length;ev++)if(er[ev]._start===eh){ep.push(ei=er[ev]);break}for(var em=[],eg=0;eg<ep.length;eg++)for(var eb=ep[eg],ey=eb._start;ey<=eb._end;ey++)em.push(ey);for(var ew=a[em[0]],ex=v.level,eE=em[0]-1;eE>=0;eE--)if(!(n[eE]&f)){ex=a[eE];break}var e_=em[em.length-1],eS=a[e_],eM=v.level;if(!(n[e_]&l)){for(var eA=e_+1;eA<=v.end;eA++)if(!(n[eA]&f)){eM=a[eA];break}}eu.push({_seqIndices:em,_sosType:Math.max(ex,ew)%2?x:w,_eosType:Math.max(eM,eS)%2?x:w})}}for(var eO=0;eO<eu.length;eO++){var eL=eu[eO],eT=eL._seqIndices,eP=eL._sosType,eD=eL._eosType,eC=1&a[eT[0]]?x:w;if(i.get(D))for(var eR=0;eR<eT.length;eR++){var ek=eT[eR];if(n[ek]&D){for(var eI=eP,ej=eR-1;ej>=0;ej--)if(!(n[eT[ej]]&f)){eI=n[eT[ej]];break}o(ek,eI&(l|N)?T:eI)}}if(i.get(E))for(var ez=0;ez<eT.length;ez++){var eU=eT[ez];if(n[eU]&E)for(var eB=ez-1;eB>=-1;eB--){var eF=-1===eB?eP:n[eT[eB]];if(eF&c){eF===C&&o(eU,M);break}}}if(i.get(C))for(var eN=0;eN<eT.length;eN++){var eY=eT[eN];n[eY]&C&&o(eY,x)}if(i.get(_)||i.get(A))for(var eH=1;eH<eT.length-1;eH++){var eq=eT[eH];if(n[eq]&(_|A)){for(var eG=0,eW=0,eX=eH-1;eX>=0&&(eG=n[eT[eX]])&f;eX--);for(var eV=eH+1;eV<eT.length&&(eW=n[eT[eV]])&f;eV++);eG===eW&&(n[eq]===_?eG===E:eG&(E|M))&&o(eq,eG)}}if(i.get(E)){for(var eK=0;eK<eT.length;eK++)if(n[eT[eK]]&E){for(var e$=eK-1;e$>=0&&n[eT[e$]]&(S|f);e$--)o(eT[e$],E);for(eK++;eK<eT.length&&n[eT[eK]]&(S|f|E);eK++)n[eT[eK]]!==E&&o(eT[eK],E)}}if(i.get(S)||i.get(_)||i.get(A))for(var eZ=0;eZ<eT.length;eZ++){var eQ=eT[eZ];if(n[eQ]&(S|_|A)){o(eQ,T);for(var eJ=eZ-1;eJ>=0&&n[eT[eJ]]&f;eJ--)o(eT[eJ],T);for(var e1=eZ+1;e1<eT.length&&n[eT[e1]]&f;e1++)o(eT[e1],T)}}if(i.get(E))for(var e0=0,e2=eP;e0<eT.length;e0++){var e3=eT[e0],e4=n[e3];e4&E?e2===w&&o(e3,w):e4&c&&(e2=e4)}if(i.get(u)){for(var e5=x|E|M,e6=e5|w,e9=[],e8=[],e7=0;e7<eT.length;e7++)if(n[eT[e7]]&u){var te=e[eT[e7]],tt=void 0;if(null!==g(te))if(e8.length<63)e8.push({char:te,seqIndex:e7});else break;else if(null!==(tt=b(te)))for(var tn=e8.length-1;tn>=0;tn--){var tr=e8[tn].char;if(tr===tt||tr===b(y(te))||g(y(tr))===te){e9.push([e8[tn].seqIndex,e7]),e8.length=tn;break}}}e9.sort(function(e,t){return e[0]-t[0]});for(var ti=0;ti<e9.length;ti++){for(var to=e9[ti],ta=to[0],ts=to[1],tl=!1,tc=0,tu=ta+1;tu<ts;tu++){var tf=eT[tu];if(n[tf]&e6){tl=!0;var td=n[tf]&e5?x:w;if(td===eC){tc=td;break}}}if(tl&&!tc){tc=eP;for(var tp=ta-1;tp>=0;tp--){var th=eT[tp];if(n[th]&e6){var tv=n[th]&e5?x:w;tc=tv!==eC?tv:eC;break}}}if(tc){if(n[eT[ta]]=n[eT[ts]]=tc,tc!==eC){for(var tm=ta+1;tm<eT.length;tm++)if(!(n[eT[tm]]&f)){h(e[eT[tm]])&D&&(n[eT[tm]]=tc);break}}if(tc!==eC){for(var tg=ts+1;tg<eT.length;tg++)if(!(n[eT[tg]]&f)){h(e[eT[tg]])&D&&(n[eT[tg]]=tc);break}}}}for(var tb=0;tb<eT.length;tb++)if(n[eT[tb]]&u){for(var ty=tb,tw=tb,tx=eP,tE=tb-1;tE>=0;tE--)if(n[eT[tE]]&f)ty=tE;else{tx=n[eT[tE]]&e5?x:w;break}for(var t_=eD,tS=tb+1;tS<eT.length;tS++)if(n[eT[tS]]&(u|f))tw=tS;else{t_=n[eT[tS]]&e5?x:w;break}for(var tM=ty;tM<=tw;tM++)n[eT[tM]]=tx===t_?tx:eC;tb=tw}}}for(var tA=v.start;tA<=v.end;tA++){var tO=a[tA],tL=n[tA];if(1&tO?tL&(w|E|M)&&a[tA]++:tL&x?a[tA]++:tL&(M|E)&&(a[tA]+=2),tL&f&&(a[tA]=0===tA?v.level:a[tA-1]),tA===v.end||h(e[tA])&(L|O))for(var tT=tA;tT>=0&&h(e[tT])&d;tT--)a[tT]=v.level}}return{levels:a,paragraphs:p};function tP(t,r){for(var i=t;i<e.length;i++){var o=n[i];if(o&(x|C))return 1;if(o&(O|w)||r&&o===N)break;if(o&l){var a=function(t){for(var r=1,i=t+1;i<e.length;i++){var o=n[i];if(o&O)break;if(o&N){if(0==--r)return i}else o&l&&r++}return -1}(i);i=-1===a?e.length:a}}return 0}},e.getMirroredCharacter=Y,e.getMirroredCharactersMap=function(e,t,n,r){var i=e.length;n=Math.max(0,null==n?0:+n),r=Math.min(i-1,null==r?i-1:+r);for(var o=new Map,a=n;a<=r;a++)if(1&t[a]){var s=Y(e[a]);null!==s&&o.set(a,s)}return o},e.getReorderSegments=H,e.getReorderedIndices=q,e.getReorderedString=function(e,t,n,r){var i=q(e,t,n,r),o=[].concat(e);return i.forEach(function(n,r){o[r]=(1&t.levels[n]?Y(e[n]):null)||e[n]}),o.join("")},e.openingToClosingBracket=g,Object.defineProperty(e,"__esModule",{value:!0}),e}({})}},1866:(e,t,n)=>{n.d(t,{Do:()=>o,Fh:()=>p});var r=n(2371),i=n(5903);let o=/\bvoid\s+main\s*\(\s*\)\s*{/g;function a(e){return e.replace(/^[ \t]*#include +<([\w\d./]+)>/gm,function(e,t){let n=r.ShaderChunk[t];return n?a(n):e})}let s=[];for(let e=0;e<256;e++)s[e]=(e<16?"0":"")+e.toString(16);let l=Object.assign||function(){let e=arguments[0];for(let t=1,n=arguments.length;t<n;t++){let n=arguments[t];if(n)for(let t in n)Object.prototype.hasOwnProperty.call(n,t)&&(e[t]=n[t])}return e},c=Date.now(),u=new WeakMap,f=new Map,d=1e10;function p(e,t){let n=function(e){let t=JSON.stringify(e,v),n=g.get(t);return null==n&&g.set(t,n=++m),n}(t),r=u.get(e);if(r||u.set(e,r=Object.create(null)),r[n])return new r[n];let o=`_onBeforeCompile${n}`,b=function(r,i){e.onBeforeCompile.call(this,r,i);let s=this.customProgramCacheKey()+"|"+r.vertexShader+"|"+r.fragmentShader,u=f[s];if(!u){let e=function(e,{vertexShader:t,fragmentShader:n},r,i){let{vertexDefs:o,vertexMainIntro:s,vertexMainOutro:l,vertexTransform:c,fragmentDefs:u,fragmentMainIntro:f,fragmentMainOutro:d,fragmentColorTransform:p,customRewriter:v,timeUniform:m}=r;if(o=o||"",s=s||"",l=l||"",u=u||"",f=f||"",d=d||"",(c||v)&&(t=a(t)),(p||v)&&(n=a(n=n.replace(/^[ \t]*#include <((?:tonemapping|encodings|colorspace|fog|premultiplied_alpha|dithering)_fragment)>/gm,"\n//!BEGIN_POST_CHUNK $1\n$&\n//!END_POST_CHUNK\n"))),v){let e=v({vertexShader:t,fragmentShader:n});t=e.vertexShader,n=e.fragmentShader}if(p){let e=[];n=n.replace(/^\/\/!BEGIN_POST_CHUNK[^]+?^\/\/!END_POST_CHUNK/gm,t=>(e.push(t),"")),d=`${p}
${e.join("\n")}
${d}`}if(m){let e=`
uniform float ${m};
`;o=e+o,u=e+u}return c&&(t=`vec3 troika_position_${i};
vec3 troika_normal_${i};
vec2 troika_uv_${i};
${t}
`,o=`${o}
void troikaVertexTransform${i}() {
  vec3 position = troika_position_${i};
  vec3 normal = troika_normal_${i};
  vec2 uv = troika_uv_${i};
  ${c}
  troika_position_${i} = position;
  troika_normal_${i} = normal;
  troika_uv_${i} = uv;
}
`,s=`
troika_position_${i} = vec3(position);
troika_normal_${i} = vec3(normal);
troika_uv_${i} = vec2(uv);
troikaVertexTransform${i}();
${s}
`,t=t.replace(/\b(position|normal|uv)\b/g,(e,t,n,r)=>/\battribute\s+vec[23]\s+$/.test(r.substr(0,n))?t:`troika_${t}_${i}`),e.map&&e.map.channel>0||(t=t.replace(/\bMAP_UV\b/g,`troika_uv_${i}`))),{vertexShader:t=h(t,i,o,s,l),fragmentShader:n=h(n,i,u,f,d)}}(this,r,t,n);u=f[s]=e}r.vertexShader=u.vertexShader,r.fragmentShader=u.fragmentShader,l(r.uniforms,this.uniforms),t.timeUniform&&(r.uniforms[t.timeUniform]={get value(){return Date.now()-c}}),this[o]&&this[o](r)},y=function(){return w(t.chained?e:e.clone())},w=function(r){let i=Object.create(r,x);return Object.defineProperty(i,"baseMaterial",{value:e}),Object.defineProperty(i,"id",{value:d++}),i.uuid=function(){let e=0xffffffff*Math.random()|0,t=0xffffffff*Math.random()|0,n=0xffffffff*Math.random()|0,r=0xffffffff*Math.random()|0;return(s[255&e]+s[e>>8&255]+s[e>>16&255]+s[e>>24&255]+"-"+s[255&t]+s[t>>8&255]+"-"+s[t>>16&15|64]+s[t>>24&255]+"-"+s[63&n|128]+s[n>>8&255]+"-"+s[n>>16&255]+s[n>>24&255]+s[255&r]+s[r>>8&255]+s[r>>16&255]+s[r>>24&255]).toUpperCase()}(),i.uniforms=l({},r.uniforms,t.uniforms),i.defines=l({},r.defines,t.defines),i.defines[`TROIKA_DERIVED_MATERIAL_${n}`]="",i.extensions=l({},r.extensions,t.extensions),i._listeners=void 0,i},x={constructor:{value:y},isDerivedMaterial:{value:!0},type:{get:()=>e.type,set:t=>{e.type=t}},isDerivedFrom:{writable:!0,configurable:!0,value:function(e){let t=this.baseMaterial;return e===t||t.isDerivedMaterial&&t.isDerivedFrom(e)||!1}},customProgramCacheKey:{writable:!0,configurable:!0,value:function(){return e.customProgramCacheKey()+"|"+n}},onBeforeCompile:{get:()=>b,set(e){this[o]=e}},copy:{writable:!0,configurable:!0,value:function(t){return e.copy.call(this,t),e.isShaderMaterial||e.isDerivedMaterial||(l(this.extensions,t.extensions),l(this.defines,t.defines),l(this.uniforms,i.LlO.clone(t.uniforms))),this}},clone:{writable:!0,configurable:!0,value:function(){return w(new e.constructor).copy(this)}},getDepthMaterial:{writable:!0,configurable:!0,value:function(){let n=this._depthMaterial;return n||((n=this._depthMaterial=p(e.isDerivedMaterial?e.getDepthMaterial():new i.CSG({depthPacking:i.N5j}),t)).defines.IS_DEPTH_MATERIAL="",n.uniforms=this.uniforms),n}},getDistanceMaterial:{writable:!0,configurable:!0,value:function(){let n=this._distanceMaterial;return n||((n=this._distanceMaterial=p(e.isDerivedMaterial?e.getDistanceMaterial():new i.aVO,t)).defines.IS_DISTANCE_MATERIAL="",n.uniforms=this.uniforms),n}},dispose:{writable:!0,configurable:!0,value(){let{_depthMaterial:t,_distanceMaterial:n}=this;t&&t.dispose(),n&&n.dispose(),e.dispose.call(this)}}};return r[n]=y,new y}function h(e,t,n,r,i){return(r||i||n)&&(e=e.replace(o,`
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
`,E=null,_=new i._4j({color:0xffffff,side:i.$EB});class S extends i.eaF{static getGeometry(){return E||(E=new i.Ho_(1,1,1,6,64).translate(0,.5,0))}constructor(){super(S.getGeometry(),_),this.pointA=new i.Pq0,this.controlA=new i.Pq0,this.controlB=new i.Pq0,this.pointB=new i.Pq0,this.radius=.01,this.dashArray=new i.I9Y,this.dashOffset=0,this.frustumCulled=!1}get material(){let e=this._derivedMaterial,t=this._baseMaterial||this._defaultMaterial||(this._defaultMaterial=_.clone());return e&&e.baseMaterial===t||(e=this._derivedMaterial=p(t,{chained:!0,uniforms:{pointA:{value:new i.Pq0},controlA:{value:new i.Pq0},controlB:{value:new i.Pq0},pointB:{value:new i.Pq0},radius:{value:.01},dashing:{value:new i.Pq0}},vertexDefs:b,vertexTransform:y,fragmentDefs:w,fragmentMainIntro:x}),t.addEventListener("dispose",function n(){t.removeEventListener("dispose",n),e.dispose()})),e}set material(e){this._baseMaterial=e}get customDepthMaterial(){return this.material.getDepthMaterial()}set customDepthMaterial(e){}get customDistanceMaterial(){return this.material.getDistanceMaterial()}set customDistanceMaterial(e){}onBeforeRender(){let{uniforms:e}=this.material,{pointA:t,controlA:n,controlB:r,pointB:i,radius:o,dashArray:a,dashOffset:s}=this;e.pointA.value.copy(t),e.controlA.value.copy(n),e.controlB.value.copy(r),e.pointB.value.copy(i),e.radius.value=o,e.dashing.value.set(a.x,a.y,s||0)}raycast(){}}},3484:(e,t,n)=>{n.d(t,{h:()=>l});var r=n(4908),i=n(8454),o=n(314);let{useSyncExternalStoreWithSelector:a}=i,s=(e,t)=>{let n=(0,o.y)(e),i=(e,i=t)=>(function(e,t=e=>e,n){let i=a(e.subscribe,e.getState,e.getInitialState,t,n);return r.useDebugValue(i),i})(n,e,i);return Object.assign(i,n),i},l=(e,t)=>e?s(e,t):s},3655:(e,t,n)=>{var r=n(4908),i="function"==typeof Object.is?Object.is:function(e,t){return e===t&&(0!==e||1/e==1/t)||e!=e&&t!=t},o=r.useState,a=r.useEffect,s=r.useLayoutEffect,l=r.useDebugValue;function c(e){var t=e.getSnapshot;e=e.value;try{var n=t();return!i(e,n)}catch(e){return!0}}var u="undefined"==typeof window||void 0===window.document||void 0===window.document.createElement?function(e,t){return t()}:function(e,t){var n=t(),r=o({inst:{value:n,getSnapshot:t}}),i=r[0].inst,u=r[1];return s(function(){i.value=n,i.getSnapshot=t,c(i)&&u({inst:i})},[e,n,t]),a(function(){return c(i)&&u({inst:i}),e(function(){c(i)&&u({inst:i})})},[e]),l(n),n};t.useSyncExternalStore=void 0!==r.useSyncExternalStore?r.useSyncExternalStore:u},3933:(e,t,n)=>{n.d(t,{A:()=>r});function r(){return(r=Object.assign?Object.assign.bind():function(e){for(var t=1;t<arguments.length;t++){var n=arguments[t];for(var r in n)({}).hasOwnProperty.call(n,r)&&(e[r]=n[r])}return e}).apply(null,arguments)}},4382:(e,t,n)=>{n.d(t,{n:()=>a});var r=n(5903);let i=new r.NRn,o=new r.Pq0;class a extends r.CmU{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry",this.setIndex([0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5]),this.setAttribute("position",new r.qtW([-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],3)),this.setAttribute("uv",new r.qtW([-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return void 0!==t&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),null!==this.boundingBox&&this.computeBoundingBox(),null!==this.boundingSphere&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new r.LuO(t,6,1);return this.setAttribute("instanceStart",new r.eHs(n,3,0)),this.setAttribute("instanceEnd",new r.eHs(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new r.LuO(t,6,1);return this.setAttribute("instanceColorStart",new r.eHs(n,3,0)),this.setAttribute("instanceColorEnd",new r.eHs(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new r.XJ7(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){null===this.boundingBox&&(this.boundingBox=new r.NRn);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;void 0!==e&&void 0!==t&&(this.boundingBox.setFromBufferAttribute(e),i.setFromBufferAttribute(t),this.boundingBox.union(i))}computeBoundingSphere(){null===this.boundingSphere&&(this.boundingSphere=new r.iyt),null===this.boundingBox&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(void 0!==e&&void 0!==t){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let r=0;for(let i=0,a=e.count;i<a;i++)o.fromBufferAttribute(e,i),r=Math.max(r,n.distanceToSquared(o)),o.fromBufferAttribute(t,i),r=Math.max(r,n.distanceToSquared(o));this.boundingSphere.radius=Math.sqrt(r),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}}},4426:(e,t,n)=>{n.d(t,{DY:()=>a,IU:()=>l,uv:()=>s});let r=[];function i(e,t,n=(e,t)=>e===t){if(e===t)return!0;if(!e||!t)return!1;let r=e.length;if(t.length!==r)return!1;for(let i=0;i<r;i++)if(!n(e[i],t[i]))return!1;return!0}function o(e,t=null,n=!1,a={}){for(let o of(null===t&&(t=[e]),r))if(i(t,o.keys,o.equal)){if(n)return;if(Object.prototype.hasOwnProperty.call(o,"error"))throw o.error;if(Object.prototype.hasOwnProperty.call(o,"response"))return a.lifespan&&a.lifespan>0&&(o.timeout&&clearTimeout(o.timeout),o.timeout=setTimeout(o.remove,a.lifespan)),o.response;if(!n)throw o.promise}let s={keys:t,equal:a.equal,remove:()=>{let e=r.indexOf(s);-1!==e&&r.splice(e,1)},promise:("object"==typeof e&&"function"==typeof e.then?e:e(...t)).then(e=>{s.response=e,a.lifespan&&a.lifespan>0&&(s.timeout=setTimeout(s.remove,a.lifespan))}).catch(e=>s.error=e)};if(r.push(s),!n)throw s.promise}let a=(e,t,n)=>o(e,t,!1,n),s=(e,t,n)=>void o(e,t,!0,n),l=e=>{if(void 0===e||0===e.length)r.splice(0,r.length);else{let t=r.find(t=>i(e,t.keys,t.equal));t&&t.remove()}}},4833:(e,t,n)=>{function r(){var e=Object.create(null);function t(e,t){var n=void 0;self.troikaDefine=function(e){return n=e};var r=URL.createObjectURL(new Blob(["/** "+e.replace(/\*/g,"")+" **/\n\ntroikaDefine(\n"+t+"\n)"],{type:"application/javascript"}));try{importScripts(r)}catch(e){console.error(e)}return URL.revokeObjectURL(r),delete self.troikaDefine,n}self.addEventListener("message",function(n){var r=n.data,i=r.messageId,o=r.action,a=r.data;try{"registerModule"===o&&function n(r,i){var o=r.id,a=r.name,s=r.dependencies;void 0===s&&(s=[]);var l=r.init;void 0===l&&(l=function(){});var c=r.getTransferables;if(void 0===c&&(c=null),!e[o])try{s=s.map(function(t){return t&&t.isWorkerModule&&(n(t,function(e){if(e instanceof Error)throw e}),t=e[t.id].value),t}),l=t("<"+a+">.init",l),c&&(c=t("<"+a+">.getTransferables",c));var u=null;"function"==typeof l?u=l.apply(void 0,s):console.error("worker module init function failed to rehydrate"),e[o]={id:o,value:u,getTransferables:c},i(u)}catch(e){e&&e.noLog||console.error(e),i(e)}}(a,function(e){e instanceof Error?postMessage({messageId:i,success:!1,error:e.message}):postMessage({messageId:i,success:!0,result:{isCallable:"function"==typeof e}})}),"callModule"===o&&function(t,n){var r,i=t.id,o=t.args;e[i]&&"function"==typeof e[i].value||n(Error("Worker module "+i+": not found or its 'init' did not return a function"));try{var a=(r=e[i]).value.apply(r,o);a&&"function"==typeof a.then?a.then(s,function(e){return n(e instanceof Error?e:Error(""+e))}):s(a)}catch(e){n(e)}function s(t){try{var r=e[i].getTransferables&&e[i].getTransferables(t);r&&Array.isArray(r)&&r.length||(r=void 0),n(t,r)}catch(e){console.error(e),n(e)}}}(a,function(e,t){e instanceof Error?postMessage({messageId:i,success:!1,error:e.message}):postMessage({messageId:i,success:!0,result:e},t||void 0)})}catch(e){postMessage({messageId:i,success:!1,error:e.stack})}})}n.d(t,{Qw:()=>f,kl:()=>function e(t){if((!t||"function"!=typeof t.init)&&!s)throw Error("requires `options.init` function");var n,r=t.dependencies,a=t.init,l=t.getTransferables,u=t.workerId,f=((n=function(){for(var e=[],t=arguments.length;t--;)e[t]=arguments[t];return n._getInitResult().then(function(t){if("function"==typeof t)return t.apply(void 0,e);throw Error("Worker module function was called but `init` did not return a callable function")})})._getInitResult=function(){var e=t.dependencies,r=t.init,i=Promise.all(e=Array.isArray(e)?e.map(function(e){return e&&(e=e.onMainThread||e)._getInitResult&&(e=e._getInitResult()),e}):[]).then(function(e){return r.apply(null,e)});return n._getInitResult=function(){return i},i},n);null==u&&(u="#default");var h="workerModule"+ ++o,v=t.name||h,m=null;function g(){for(var e=[],t=arguments.length;t--;)e[t]=arguments[t];if(!i())return f.apply(void 0,e);if(!m){m=p(u,"registerModule",g.workerModuleData);var n=function(){m=null,c[u].delete(n)};(c[u]||(c[u]=new Set)).add(n)}return m.then(function(t){if(t.isCallable)return p(u,"callModule",{id:h,args:e});throw Error("Worker module function was called but `init` did not return a callable function")})}return r=r&&r.map(function(t){return"function"!=typeof t||t.workerModuleData||(s=!0,t=e({workerId:u,name:"<"+v+"> function dependency: "+t.name,init:"function(){return (\n"+d(t)+"\n)}"}),s=!1),t&&t.workerModuleData&&(t=t.workerModuleData),t}),g.workerModuleData={isWorkerModule:!0,id:h,name:v,dependencies:r,init:d(a),getTransferables:l&&d(l)},g.onMainThread=f,g}}),n(9991);var i=function(){var e=!1;if("undefined"!=typeof window&&void 0!==window.document)try{new Worker(URL.createObjectURL(new Blob([""],{type:"application/javascript"}))).terminate(),e=!0}catch(e){console.log("Troika createWorkerModule: web workers not allowed; falling back to main thread execution. Cause: ["+e.message+"]")}return i=function(){return e},e},o=0,a=0,s=!1,l=Object.create(null),c=Object.create(null),u=Object.create(null);function f(e){c[e]&&c[e].forEach(function(e){e()}),l[e]&&(l[e].terminate(),delete l[e])}function d(e){var t=e.toString();return!/^function/.test(t)&&/^\w+\s*\(/.test(t)&&(t="function "+t),t}function p(e,t,n){return new Promise(function(i,o){var s=++a;u[s]=function(e){e.success?i(e.result):o(Error("Error in worker "+t+" call: "+e.error))},(function(e){var t=l[e];if(!t){var n=d(r);(t=l[e]=new Worker(URL.createObjectURL(new Blob(["/** Worker Module Bootstrap: "+e.replace(/\*/g,"")+" **/\n\n;("+n+")()"],{type:"application/javascript"})))).onmessage=function(e){var t=e.data,n=t.messageId,r=u[n];if(!r)throw Error("WorkerModule response with empty or unknown messageId");delete u[n],r(t)}}return t})(e).postMessage({messageId:s,action:t,data:n})})}},6421:(e,t,n)=>{n.d(t,{UC:()=>ti,YJ:()=>to,q7:()=>ta,ZL:()=>tr,bL:()=>tt,wv:()=>ts,l9:()=>tn});var r=n(4908),i=n.t(r,2),o=n(9898),a=n(9086),s=n(9910),l=n(6043),c=n(3842),u=n(9915),f=n(4401),d=n(6579),p=n(5225),h=n(1163),v=n(4927),m=n(5857),g=n(6541),b=n(8563),y=n(6587),w=n(1573),x=Object.defineProperty,E=(e,t)=>x(e,"name",{value:t,configurable:!0}),_=!1;function S(){let[e,t]=r.useState(_);return r.useEffect(()=>{_||(_=!0,t(!0))},[]),e}E(S,"useIsHydrated");var M=i[" useSyncExternalStore ".trim().toString()];function A(){return()=>{}}function O(){return M(A,()=>!0,()=>!1)}E(A,"subscribe"),E(O,"useIsHydratedModern");var L="function"==typeof M?O:S,T=n(3312),P=Object.defineProperty,D=(e,t)=>P(e,"name",{value:t,configurable:!0}),C="rovingFocusGroup.onEntryFocus",R={bubbles:!1,cancelable:!0},k="RovingFocusGroup",[I,j,z]=(0,u.N)(k),[U,B]=(0,s.A)(k,[z]),[F,N]=U(k),Y=r.forwardRef(D(function(e,t){return(0,T.jsx)(I.Provider,{scope:e.__scopeRovingFocusGroup,children:(0,T.jsx)(I.Slot,{scope:e.__scopeRovingFocusGroup,children:(0,T.jsx)(H,{...e,ref:t})})})},"RovingFocusGroup")),H=r.forwardRef(D(function(e,t){let{__scopeRovingFocusGroup:n,orientation:i,loop:s=!1,dir:u,currentTabStopId:d,defaultCurrentTabStopId:p,onCurrentTabStopIdChange:h,onEntryFocus:v,preventScrollOnEntryFocus:m=!1,...g}=e,b=r.useRef(null),w=(0,a.s)(t,b),x=(0,f.jH)(u),[E,_]=(0,l.i)({prop:d,defaultProp:null!=p?p:null,onChange:h,caller:k}),[S,M]=r.useState(!1),A=(0,y.c)(v),O=j(n),L=r.useRef(!1),[P,D]=r.useState(0);return r.useEffect(()=>{let e=b.current;if(e)return e.addEventListener(C,A),()=>e.removeEventListener(C,A)},[A]),(0,T.jsx)(F,{scope:n,orientation:i,dir:x,loop:s,currentTabStopId:E,onItemFocus:r.useCallback(e=>_(e),[_]),onItemShiftTab:r.useCallback(()=>M(!0),[]),onFocusableItemAdd:r.useCallback(()=>D(e=>e+1),[]),onFocusableItemRemove:r.useCallback(()=>D(e=>e-1),[]),children:(0,T.jsx)(c.sG.div,{tabIndex:S||0===P?-1:0,"data-orientation":i,...g,ref:w,style:{outline:"none",...e.style},onMouseDown:(0,o.mK)(e.onMouseDown,()=>{L.current=!0}),onFocus:(0,o.mK)(e.onFocus,e=>{let t=!L.current;if(e.target===e.currentTarget&&t&&!S){let t=new CustomEvent(C,R);if(e.currentTarget.dispatchEvent(t),!t.defaultPrevented){let e=O().filter(e=>e.focusable);V([e.find(e=>e.active),e.find(e=>e.id===E),...e].filter(Boolean).map(e=>e.ref.current),m)}}L.current=!1}),onBlur:(0,o.mK)(e.onBlur,()=>M(!1))})})},"RovingFocusGroupImpl")),q=r.forwardRef(D(function(e,t){let{__scopeRovingFocusGroup:n,focusable:i=!0,active:a=!1,tabStopId:s,children:l,...u}=e,f=(0,b.B)(),d=s||f,p=N("RovingFocusGroupItem",n),h=p.currentTabStopId===d,v=j(n),{onFocusableItemAdd:m,onFocusableItemRemove:g,currentTabStopId:y}=p,x=L();return(0,w.N)(()=>{if(x&&i)return m(),()=>g()},[x,i,m,g]),r.useEffect(()=>{if(!x&&i)return m(),()=>g()},[x,i,m,g]),(0,T.jsx)(I.ItemSlot,{scope:n,id:d,focusable:i,active:a,children:(0,T.jsx)(c.sG.span,{tabIndex:h?0:-1,"data-orientation":p.orientation,...u,ref:t,onMouseDown:(0,o.mK)(e.onMouseDown,e=>{i?p.onItemFocus(d):e.preventDefault()}),onFocus:(0,o.mK)(e.onFocus,()=>p.onItemFocus(d)),onKeyDown:(0,o.mK)(e.onKeyDown,e=>{if("Tab"===e.key&&e.shiftKey)return void p.onItemShiftTab();if(e.target!==e.currentTarget)return;let t=X(e,p.orientation,p.dir);if(void 0!==t){if(e.metaKey||e.ctrlKey||e.altKey||e.shiftKey)return;e.preventDefault();let n=v().filter(e=>e.focusable).map(e=>e.ref.current);if("last"===t)n.reverse();else if("prev"===t||"next"===t){"prev"===t&&n.reverse();let r=n.indexOf(e.currentTarget);n=p.loop?K(n,r+1):n.slice(r+1)}setTimeout(()=>V(n))}}),children:"function"==typeof l?l({isCurrentTabStop:h,hasTabStop:null!=y}):l})})},"RovingFocusGroupItem")),G={ArrowLeft:"prev",ArrowUp:"prev",ArrowRight:"next",ArrowDown:"next",PageUp:"first",Home:"first",PageDown:"last",End:"last"};function W(e,t){return"rtl"!==t?e:"ArrowLeft"===e?"ArrowRight":"ArrowRight"===e?"ArrowLeft":e}function X(e,t,n){let r=W(e.key,n);if(!("vertical"===t&&["ArrowLeft","ArrowRight"].includes(r))&&!("horizontal"===t&&["ArrowUp","ArrowDown"].includes(r)))return G[r]}function V(e){let t=arguments.length>1&&void 0!==arguments[1]&&arguments[1],n=document.activeElement;for(let r of e)if(r===n||(r.focus({preventScroll:t}),document.activeElement!==n))return}function K(e,t){return e.map((n,r)=>e[(t+r)%e.length])}D(W,"getDirectionAwareKey"),D(X,"getFocusIntent"),D(V,"focusFirst"),D(K,"wrapArray");var $=n(7948),Z=n(6898),Q=n(311),J=Object.defineProperty,ee=(e,t)=>J(e,"name",{value:t,configurable:!0}),et=["Enter"," "],en=["ArrowUp","PageDown","End"],er=["ArrowDown","PageUp","Home",...en];[...et],[...et];var ei="Menu",[eo,ea,es]=(0,u.N)(ei),[el,ec]=(0,s.A)(ei,[es,v.Bk,B]),eu=(0,v.Bk)(),ef=B(),[ed,ep]=el(ei),[eh,ev]=el(ei),em=ee(e=>{let{__scopeMenu:t,open:n=!1,children:i,dir:o,onOpenChange:a,modal:s=!0}=e,l=eu(t),[c,u]=r.useState(null),d=r.useRef(!1),p=(0,y.c)(a),h=(0,f.jH)(o);return r.useEffect(()=>{let e=ee(()=>{d.current=!0,document.addEventListener("pointerdown",t,{capture:!0,once:!0}),document.addEventListener("pointermove",t,{capture:!0,once:!0})},"handleKeyDown"),t=ee(()=>d.current=!1,"handlePointer");return document.addEventListener("keydown",e,{capture:!0}),()=>{document.removeEventListener("keydown",e,{capture:!0}),document.removeEventListener("pointerdown",t,{capture:!0}),document.removeEventListener("pointermove",t,{capture:!0})}},[]),r.useEffect(()=>{if(!n)return;let e=ee(()=>p(!1),"handleBlur");return window.addEventListener("blur",e),()=>window.removeEventListener("blur",e)},[n,p]),(0,T.jsx)(v.bL,{...l,children:(0,T.jsx)(ed,{scope:t,open:n,onOpenChange:p,content:c,onContentChange:u,children:(0,T.jsx)(eh,{scope:t,onClose:r.useCallback(()=>p(!1),[p]),isUsingKeyboardRef:d,dir:h,modal:s,children:i})})})},"Menu"),eg=r.forwardRef(ee(function(e,t){let{__scopeMenu:n,...r}=e,i=eu(n);return(0,T.jsx)(v.Mz,{...i,...r,ref:t})},"MenuAnchor")),eb="MenuPortal",[ey,ew]=el(eb,{forceMount:void 0}),ex=ee(e=>{let{__scopeMenu:t,forceMount:n,children:r,container:i}=e,o=ep(eb,t);return(0,T.jsx)(ey,{scope:t,forceMount:n,children:(0,T.jsx)(g.C,{present:n||o.open,children:(0,T.jsx)(m.Z,{asChild:!0,container:i,children:r})})})},"MenuPortal"),eE="MenuContent",[e_,eS]=el(eE),eM=r.forwardRef(ee(function(e,t){let n=ew(eE,e.__scopeMenu),{forceMount:r=n.forceMount,...i}=e,o=ep(eE,e.__scopeMenu),a=ev(eE,e.__scopeMenu);return(0,T.jsx)(eo.Provider,{scope:e.__scopeMenu,children:(0,T.jsx)(g.C,{present:r||o.open,children:(0,T.jsx)(eo.Slot,{scope:e.__scopeMenu,children:a.modal?(0,T.jsx)(eA,{...i,ref:t}):(0,T.jsx)(eO,{...i,ref:t})})})})},"MenuContent")),eA=r.forwardRef(ee(function(e,t){let n=ep(eE,e.__scopeMenu),i=r.useRef(null),s=(0,a.s)(t,i);return r.useEffect(()=>{let e=i.current;if(e)return(0,Z.Eq)(e)},[]),(0,T.jsx)(eT,{...e,ref:s,trapFocus:n.open,disableOutsidePointerEvents:n.open,disableOutsideScroll:!0,onFocusOutside:(0,o.mK)(e.onFocusOutside,e=>e.preventDefault(),{checkForDefaultPrevented:!1}),onDismiss:()=>n.onOpenChange(!1)})},"MenuRootContentModal")),eO=r.forwardRef(ee(function(e,t){let n=ep(eE,e.__scopeMenu);return(0,T.jsx)(eT,{...e,ref:t,trapFocus:!1,disableOutsidePointerEvents:!1,disableOutsideScroll:!1,onDismiss:()=>n.onOpenChange(!1)})},"MenuRootContentNonModal")),eL=(0,$.TL)("MenuContent.ScrollLock"),eT=r.forwardRef(ee(function(e,t){let{__scopeMenu:n,loop:i=!1,trapFocus:s,onOpenAutoFocus:l,onCloseAutoFocus:c,disableOutsidePointerEvents:u,onEntryFocus:f,onEscapeKeyDown:m,onPointerDownOutside:g,onFocusOutside:b,onInteractOutside:y,onDismiss:w,disableOutsideScroll:x,...E}=e,_=ep(eE,n),S=ev(eE,n),M=eu(n),A=ef(n),O=ea(n),[L,P]=r.useState(null),D=r.useRef(null),C=(0,a.s)(t,D,_.onContentChange),R=r.useRef(0),k=r.useRef(""),I=r.useRef(0),j=r.useRef(null),z=r.useRef("right"),U=r.useRef(0),B=x?Q.A:r.Fragment,F=ee(e=>{var t,n;let r=k.current+e,i=O().filter(e=>!e.disabled),o=document.activeElement,a=null==(t=i.find(e=>e.ref.current===o))?void 0:t.textValue,s=eW(i.map(e=>e.textValue),r,a),l=null==(n=i.find(e=>e.textValue===s))?void 0:n.ref.current;l&&setTimeout(()=>l.focus())},"handleTypeaheadSearch");r.useEffect(()=>()=>window.clearTimeout(R.current),[]),(0,p.Oh)();let N=r.useCallback(e=>{var t,n;return z.current===(null==(t=j.current)?void 0:t.side)&&eV(e,null==(n=j.current)?void 0:n.area)},[]);return(0,T.jsx)(e_,{scope:n,searchRef:k,onItemEnter:r.useCallback(e=>{N(e)&&e.preventDefault()},[N]),onItemLeave:r.useCallback(e=>{var t;N(e)||(null==(t=D.current)||t.focus(),P(null))},[N]),onTriggerLeave:r.useCallback(e=>{N(e)&&e.preventDefault()},[N]),pointerGraceTimerRef:I,onPointerGraceIntentChange:r.useCallback(e=>{j.current=e},[]),children:(0,T.jsx)(B,{...x?{as:eL,allowPinchZoom:!0}:void 0,children:(0,T.jsx)(h.n,{asChild:!0,trapped:s,onMountAutoFocus:(0,o.mK)(l,e=>{var t;e.preventDefault(),null==(t=D.current)||t.focus({preventScroll:!0})}),onUnmountAutoFocus:c,children:(0,T.jsx)(d.qW,{asChild:!0,disableOutsidePointerEvents:u,onEscapeKeyDown:m,onPointerDownOutside:g,onFocusOutside:b,onInteractOutside:y,onDismiss:w,children:(0,T.jsx)(Y,{asChild:!0,...A,dir:S.dir,orientation:"vertical",loop:i,currentTabStopId:L,onCurrentTabStopIdChange:P,onEntryFocus:(0,o.mK)(f,e=>{S.isUsingKeyboardRef.current||e.preventDefault()}),preventScrollOnEntryFocus:!0,children:(0,T.jsx)(v.UC,{role:"menu","aria-orientation":"vertical","data-state":eY(_.open),"data-radix-menu-content":"",dir:S.dir,...M,...E,ref:C,style:{outline:"none",...E.style},onKeyDown:(0,o.mK)(E.onKeyDown,e=>{let t=e.target.closest("[data-radix-menu-content]")===e.currentTarget,n=e.ctrlKey||e.altKey||e.metaKey,r=1===e.key.length;t&&("Tab"===e.key&&e.preventDefault(),!n&&r&&F(e.key));let i=D.current;if(e.target!==i||!er.includes(e.key))return;e.preventDefault();let o=O().filter(e=>!e.disabled).map(e=>e.ref.current);en.includes(e.key)&&o.reverse(),eq(o)}),onBlur:(0,o.mK)(e.onBlur,e=>{e.currentTarget.contains(e.target)||(window.clearTimeout(R.current),k.current="")}),onPointerMove:(0,o.mK)(e.onPointerMove,eK(e=>{let t=e.target,n=U.current!==e.clientX;e.currentTarget.contains(t)&&n&&(z.current=e.clientX>U.current?"right":"left",U.current=e.clientX)}))})})})})})})},"MenuContentImpl")),eP=r.forwardRef(ee(function(e,t){let{__scopeMenu:n,...r}=e;return(0,T.jsx)(c.sG.div,{role:"group",...r,ref:t})},"MenuGroup")),eD="MenuItem",eC="menu.itemSelect",eR=r.forwardRef(ee(function(e,t){let{disabled:n=!1,onSelect:i,...s}=e,l=r.useRef(null),u=ev(eD,e.__scopeMenu),f=eS(eD,e.__scopeMenu),d=(0,a.s)(t,l),p=r.useRef(!1),h=ee(()=>{let e=l.current;if(!n&&e){let t=new CustomEvent(eC,{bubbles:!0,cancelable:!0});e.addEventListener(eC,e=>null==i?void 0:i(e),{once:!0}),(0,c.hO)(e,t),t.defaultPrevented?p.current=!1:u.onClose()}},"handleSelect");return(0,T.jsx)(ek,{...s,ref:d,disabled:n,onClick:(0,o.mK)(e.onClick,h),onPointerDown:t=>{var n;null==(n=e.onPointerDown)||n.call(e,t),p.current=!0},onPointerUp:(0,o.mK)(e.onPointerUp,e=>{var t;p.current||null==(t=e.currentTarget)||t.click()}),onKeyDown:(0,o.mK)(e.onKeyDown,e=>{!n&&e.target===e.currentTarget&&(""===f.searchRef.current||" "!==e.key)&&et.includes(e.key)&&(e.currentTarget.click(),e.preventDefault())})})},"MenuItem")),ek=r.forwardRef(ee(function(e,t){let{__scopeMenu:n,disabled:i=!1,textValue:s,...l}=e,u=eS(eD,n),f=ef(n),d=r.useRef(null),p=(0,a.s)(t,d),[h,v]=r.useState(!1),[m,g]=r.useState("");return r.useEffect(()=>{let e=d.current;if(e){var t;g((null!=(t=e.textContent)?t:"").trim())}},[l.children]),(0,T.jsx)(eo.ItemSlot,{scope:n,disabled:i,textValue:null!=s?s:m,children:(0,T.jsx)(q,{asChild:!0,...f,focusable:!i,children:(0,T.jsx)(c.sG.div,{role:"menuitem","data-highlighted":h?"":void 0,"aria-disabled":i||void 0,"data-disabled":i?"":void 0,...l,ref:p,onPointerMove:(0,o.mK)(e.onPointerMove,eK(e=>{i?u.onItemLeave(e):(u.onItemEnter(e),e.defaultPrevented||e.currentTarget.focus({preventScroll:!0}))})),onPointerLeave:(0,o.mK)(e.onPointerLeave,eK(e=>u.onItemLeave(e))),onFocus:(0,o.mK)(e.onFocus,()=>v(!0)),onBlur:(0,o.mK)(e.onBlur,()=>v(!1))})})})},"MenuItemImpl")),[eI,ej]=el("MenuRadioGroup",{value:void 0,onValueChange:ee(()=>{},"onValueChange")}),[ez,eU]=el("MenuItemIndicator",{checked:!1}),eB=r.forwardRef(ee(function(e,t){let{__scopeMenu:n,...r}=e;return(0,T.jsx)(c.sG.div,{role:"separator","aria-orientation":"horizontal",...r,ref:t})},"MenuSeparator")),[eF,eN]=el("MenuSub");function eY(e){return e?"open":"closed"}function eH(e){return"indeterminate"===e}function eq(e){let t=document.activeElement;for(let n of e)if(n===t||(n.focus(),document.activeElement!==t))return}function eG(e,t){return e.map((n,r)=>e[(t+r)%e.length])}function eW(e,t,n){let r=t.length>1&&Array.from(t).every(e=>e===t[0])?t[0]:t,i=n?e.indexOf(n):-1,o=eG(e,Math.max(i,0));1===r.length&&(o=o.filter(e=>e!==n));let a=o.find(e=>e.toLowerCase().startsWith(r.toLowerCase()));return a!==n?a:void 0}function eX(e,t){let{x:n,y:r}=e,i=!1;for(let e=0,o=t.length-1;e<t.length;o=e++){let a=t[e],s=t[o],l=a.x,c=a.y,u=s.x,f=s.y;c>r!=f>r&&n<(u-l)*(r-c)/(f-c)+l&&(i=!i)}return i}function eV(e,t){return!!t&&eX({x:e.clientX,y:e.clientY},t)}function eK(e){return t=>"mouse"===t.pointerType?e(t):void 0}ee(eY,"getOpenState"),ee(eH,"isIndeterminate"),ee(function(e){return eH(e)?"indeterminate":e?"checked":"unchecked"},"getCheckedState"),ee(eq,"focusFirst"),ee(eG,"wrapArray"),ee(eW,"getNextMatch"),ee(eX,"isPointInPolygon"),ee(eV,"isPointerInGraceArea"),ee(eK,"whenMouse");var e$=Object.defineProperty,eZ=(e,t)=>e$(e,"name",{value:t,configurable:!0}),eQ="DropdownMenu",[eJ,e1]=(0,s.A)(eQ,[ec]),e0=ec(),[e2,e3]=eJ(eQ),e4=eZ(e=>{let{__scopeDropdownMenu:t,children:n,dir:i,open:o,defaultOpen:a,onOpenChange:s,modal:c=!0}=e,u=e0(t),f=r.useRef(null),[d,p]=(0,l.i)({prop:o,defaultProp:null!=a&&a,onChange:s,caller:eQ});return(0,T.jsx)(e2,{scope:t,triggerId:(0,b.B)(),triggerRef:f,contentId:(0,b.B)(),open:d,onOpenChange:p,onOpenToggle:r.useCallback(()=>p(e=>!e),[p]),modal:c,children:(0,T.jsx)(em,{...u,open:d,onOpenChange:p,dir:i,modal:c,children:n})})},"DropdownMenu"),e5=r.forwardRef(eZ(function(e,t){let{__scopeDropdownMenu:n,disabled:r=!1,...i}=e,s=e3("DropdownMenuTrigger",n),l=e0(n),u=(0,a.s)(t,s.triggerRef);return(0,T.jsx)(eg,{asChild:!0,...l,children:(0,T.jsx)(c.sG.button,{type:"button",id:s.triggerId,"aria-haspopup":"menu","aria-expanded":s.open,"aria-controls":s.open?s.contentId:void 0,"data-state":s.open?"open":"closed","data-disabled":r?"":void 0,disabled:r,...i,ref:u,onPointerDown:(0,o.mK)(e.onPointerDown,e=>{!r&&0===e.button&&!1===e.ctrlKey&&(s.onOpenToggle(),s.open||e.preventDefault())}),onKeyDown:(0,o.mK)(e.onKeyDown,e=>{!r&&(["Enter"," "].includes(e.key)&&s.onOpenToggle(),"ArrowDown"===e.key&&s.onOpenChange(!0),["Enter"," ","ArrowDown"].includes(e.key)&&e.preventDefault())})})})},"DropdownMenuTrigger")),e6=eZ(e=>{let{__scopeDropdownMenu:t,...n}=e,r=e0(t);return(0,T.jsx)(ex,{...r,...n})},"DropdownMenuPortal"),e9=r.forwardRef(eZ(function(e,t){let{__scopeDropdownMenu:n,...i}=e,a=e3("DropdownMenuContent",n),s=e0(n),l=r.useRef(!1);return(0,T.jsx)(eM,{id:a.contentId,"aria-labelledby":a.triggerId,...s,...i,ref:t,onCloseAutoFocus:(0,o.mK)(e.onCloseAutoFocus,e=>{var t;l.current||null==(t=a.triggerRef.current)||t.focus(),l.current=!1,e.preventDefault()}),onInteractOutside:(0,o.mK)(e.onInteractOutside,e=>{let t=e.detail.originalEvent,n=0===t.button&&!0===t.ctrlKey,r=2===t.button||n;(!a.modal||r)&&(l.current=!0)}),style:{...e.style,"--radix-dropdown-menu-content-transform-origin":"var(--radix-popper-transform-origin)","--radix-dropdown-menu-content-available-width":"var(--radix-popper-available-width)","--radix-dropdown-menu-content-available-height":"var(--radix-popper-available-height)","--radix-dropdown-menu-trigger-width":"var(--radix-popper-anchor-width)","--radix-dropdown-menu-trigger-height":"var(--radix-popper-anchor-height)"}})},"DropdownMenuContent")),e8=r.forwardRef(eZ(function(e,t){let{__scopeDropdownMenu:n,...r}=e,i=e0(n);return(0,T.jsx)(eP,{...i,...r,ref:t})},"DropdownMenuGroup")),e7=r.forwardRef(eZ(function(e,t){let{__scopeDropdownMenu:n,...r}=e,i=e0(n);return(0,T.jsx)(eR,{...i,...r,ref:t})},"DropdownMenuItem")),te=r.forwardRef(eZ(function(e,t){let{__scopeDropdownMenu:n,...r}=e,i=e0(n);return(0,T.jsx)(eB,{...i,...r,ref:t})},"DropdownMenuSeparator")),tt=e4,tn=e5,tr=e6,ti=e9,to=e8,ta=e7,ts=te},6617:(e,t,n)=>{n.d(t,{A:()=>r});function r(){return function(e){function t(e,t){for(var n,r,i,o,a,s=/([MLQCZ])([^MLQCZ]*)/g;n=s.exec(e);){var l=n[2].replace(/^\s*|\s*$/g,"").split(/[,\s]+/).map(function(e){return parseFloat(e)});switch(n[1]){case"M":o=r=l[0],a=i=l[1];break;case"L":(l[0]!==o||l[1]!==a)&&t("L",o,a,o=l[0],a=l[1]);break;case"Q":t("Q",o,a,o=l[2],a=l[3],l[0],l[1]);break;case"C":t("C",o,a,o=l[4],a=l[5],l[0],l[1],l[2],l[3]);break;case"Z":(o!==r||a!==i)&&t("L",o,a,r,i)}}}function n(e,n,r){void 0===r&&(r=16);var i={x:0,y:0};t(e,function(e,t,o,a,s,l,c,u,f){switch(e){case"L":n(t,o,a,s);break;case"Q":for(var d=t,p=o,h=1;h<r;h++)!function(e,t,n,r,i,o,a,s){var l=1-a;s.x=l*l*e+2*l*a*n+a*a*i,s.y=l*l*t+2*l*a*r+a*a*o}(t,o,l,c,a,s,h/(r-1),i),n(d,p,i.x,i.y),d=i.x,p=i.y;break;case"C":for(var v=t,m=o,g=1;g<r;g++)!function(e,t,n,r,i,o,a,s,l,c){var u=1-l;c.x=u*u*u*e+3*u*u*l*n+3*u*l*l*i+l*l*l*a,c.y=u*u*u*t+3*u*u*l*r+3*u*l*l*o+l*l*l*s}(t,o,l,c,u,f,a,s,g/(r-1),i),n(v,m,i.x,i.y),v=i.x,m=i.y}})}var r="precision highp float;attribute vec2 aUV;varying vec2 vUV;void main(){vUV=aUV;gl_Position=vec4(mix(vec2(-1.0),vec2(1.0),aUV),0.0,1.0);}",i=new WeakMap,o={premultipliedAlpha:!1,preserveDrawingBuffer:!0,antialias:!1,depth:!1};function a(e,t){var n=e.getContext?e.getContext("webgl",o):e,r=i.get(n);if(!r){var a="undefined"!=typeof WebGL2RenderingContext&&n instanceof WebGL2RenderingContext,s={},l={},c={},u=-1,f=[];function d(e){var t=s[e];if(!t&&!(t=s[e]=n.getExtension(e)))throw Error(e+" not supported");return t}function p(e,t){var r=n.createShader(t);return n.shaderSource(r,e),n.compileShader(r),r}function h(){s={},l={},c={},u=-1,f.length=0}n.canvas.addEventListener("webglcontextlost",function(e){h(),e.preventDefault()},!1),i.set(n,r={gl:n,isWebGL2:a,getExtension:d,withProgram:function(e,t,r,i){if(!l[e]){var o={},s={},c=n.createProgram();n.attachShader(c,p(t,n.VERTEX_SHADER)),n.attachShader(c,p(r,n.FRAGMENT_SHADER)),n.linkProgram(c),l[e]={program:c,transaction:function(e){n.useProgram(c),e({setUniform:function(e,t){for(var r=[],i=arguments.length-2;i-- >0;)r[i]=arguments[i+2];var o=s[t]||(s[t]=n.getUniformLocation(c,t));n["uniform"+e].apply(n,[o].concat(r))},setAttribute:function(e,t,r,i,s){var l=o[e];l||(l=o[e]={buf:n.createBuffer(),loc:n.getAttribLocation(c,e),data:null}),n.bindBuffer(n.ARRAY_BUFFER,l.buf),n.vertexAttribPointer(l.loc,t,n.FLOAT,!1,0,0),n.enableVertexAttribArray(l.loc),a?n.vertexAttribDivisor(l.loc,i):d("ANGLE_instanced_arrays").vertexAttribDivisorANGLE(l.loc,i),s!==l.data&&(n.bufferData(n.ARRAY_BUFFER,s,r),l.data=s)}})}}}l[e].transaction(i)},withTexture:function(e,t){u++;try{n.activeTexture(n.TEXTURE0+u);var r=c[e];r||(r=c[e]=n.createTexture(),n.bindTexture(n.TEXTURE_2D,r),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(n.TEXTURE_2D,n.TEXTURE_MAG_FILTER,n.NEAREST)),n.bindTexture(n.TEXTURE_2D,r),t(r,u)}finally{u--}},withTextureFramebuffer:function(e,t,r){var i=n.createFramebuffer();f.push(i),n.bindFramebuffer(n.FRAMEBUFFER,i),n.activeTexture(n.TEXTURE0+t),n.bindTexture(n.TEXTURE_2D,e),n.framebufferTexture2D(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,e,0);try{r(i)}finally{n.deleteFramebuffer(i),n.bindFramebuffer(n.FRAMEBUFFER,f[--f.length-1]||null)}},handleContextLoss:h})}t(r)}function s(e,t,n,i,o,s,l,c){void 0===l&&(l=15),void 0===c&&(c=null),a(e,function(e){var a=e.gl,u=e.withProgram;(0,e.withTexture)("copy",function(e,f){a.texImage2D(a.TEXTURE_2D,0,a.RGBA,o,s,0,a.RGBA,a.UNSIGNED_BYTE,t),u("copy",r,"precision highp float;uniform sampler2D tex;varying vec2 vUV;void main(){gl_FragColor=texture2D(tex,vUV);}",function(e){var t=e.setUniform;(0,e.setAttribute)("aUV",2,a.STATIC_DRAW,0,new Float32Array([0,0,2,0,0,2])),t("1i","image",f),a.bindFramebuffer(a.FRAMEBUFFER,c||null),a.disable(a.BLEND),a.colorMask(8&l,4&l,2&l,1&l),a.viewport(n,i,o,s),a.scissor(n,i,o,s),a.drawArrays(a.TRIANGLES,0,3)})})})}var l=Object.freeze({__proto__:null,withWebGLContext:a,renderImageData:s,resizeWebGLCanvasWithoutClearing:function(e,t,n){var r=e.width,i=e.height;a(e,function(o){var a=o.gl,l=new Uint8Array(r*i*4);a.readPixels(0,0,r,i,a.RGBA,a.UNSIGNED_BYTE,l),e.width=t,e.height=n,s(a,l,0,0,r,i)})}});function c(e,t,r,i,o,a){void 0===a&&(a=1);var s=new Uint8Array(e*t),l=i[2]-i[0],c=i[3]-i[1],u=[];n(r,function(e,t,n,r){u.push({x1:e,y1:t,x2:n,y2:r,minX:Math.min(e,n),minY:Math.min(t,r),maxX:Math.max(e,n),maxY:Math.max(t,r)})}),u.sort(function(e,t){return e.maxX-t.maxX});for(var f=0;f<e;f++)for(var d=0;d<t;d++){var p=function(e,t){for(var n=1/0,r=1/0,i=u.length;i--;){var o=u[i];if(o.maxX+r<=e)break;if(e+r>o.minX&&t-r<o.maxY&&t+r>o.minY){var a=function(e,t,n,r,i,o){var a=i-n,s=o-r,l=a*a+s*s,c=l?Math.max(0,Math.min(1,((e-n)*a+(t-r)*s)/l)):0,u=e-(n+c*a),f=t-(r+c*s);return u*u+f*f}(e,t,o.x1,o.y1,o.x2,o.y2);a<n&&(r=Math.sqrt(n=a))}}return function(e,t){for(var n=0,r=u.length;r--;){var i=u[r];if(i.maxX<=e)break;i.y1>t!=i.y2>t&&e<(i.x2-i.x1)*(t-i.y1)/(i.y2-i.y1)+i.x1&&(n+=i.y1<i.y2?1:-1)}return 0!==n}(e,t)&&(r=-r),r}(i[0]+l*(f+.5)/e,i[1]+c*(d+.5)/t),h=Math.pow(1-Math.abs(p)/o,a)/2;p<0&&(h=1-h),h=Math.max(0,Math.min(255,Math.round(255*h))),s[d*e+f]=h}return s}function u(e,t,n,r,i,o,a,s,l,c){void 0===o&&(o=1),void 0===s&&(s=0),void 0===l&&(l=0),void 0===c&&(c=0),f(e,t,n,r,i,o,a,null,s,l,c)}function f(e,t,n,r,i,o,a,l,u,f,d){void 0===o&&(o=1),void 0===u&&(u=0),void 0===f&&(f=0),void 0===d&&(d=0);for(var p=c(e,t,n,r,i,o),h=new Uint8Array(4*p.length),v=0;v<p.length;v++)h[4*v+d]=p[v];s(a,h,u,f,e,t,1<<3-d,l)}var d=Object.freeze({__proto__:null,generate:c,generateIntoCanvas:u,generateIntoFramebuffer:f}),p=new Float32Array([0,0,2,0,0,2]),h=null,v=!1,m={},g=new WeakMap;function b(e){if(!v&&!E(e))throw Error("WebGL generation not supported")}function y(e,t,n,r,i,o,s){if(void 0===o&&(o=1),void 0===s&&(s=null),!s&&!(s=h)){var l="function"==typeof OffscreenCanvas?new OffscreenCanvas(1,1):"undefined"!=typeof document?document.createElement("canvas"):null;if(!l)throw Error("OffscreenCanvas or DOM canvas not supported");s=h=l.getContext("webgl",{depth:!1})}b(s);var c=new Uint8Array(e*t*4);a(s,function(a){var s=a.gl,l=a.withTexture,u=a.withTextureFramebuffer;l("readable",function(a,l){s.texImage2D(s.TEXTURE_2D,0,s.RGBA,e,t,0,s.RGBA,s.UNSIGNED_BYTE,null),u(a,l,function(a){x(e,t,n,r,i,o,s,a,0,0,0),s.readPixels(0,0,e,t,s.RGBA,s.UNSIGNED_BYTE,c)})})});for(var u=new Uint8Array(e*t),f=0,d=0;f<c.length;f+=4)u[d++]=c[f];return u}function w(e,t,n,r,i,o,a,s,l,c){void 0===o&&(o=1),void 0===s&&(s=0),void 0===l&&(l=0),void 0===c&&(c=0),x(e,t,n,r,i,o,a,null,s,l,c)}function x(e,t,i,o,s,l,c,u,f,d,h){void 0===l&&(l=1),void 0===f&&(f=0),void 0===d&&(d=0),void 0===h&&(h=0),b(c);var v=[];n(i,function(e,t,n,r){v.push(e,t,n,r)}),v=new Float32Array(v),a(c,function(n){var i=n.gl,a=n.isWebGL2,c=n.getExtension,m=n.withProgram,g=n.withTexture,b=n.withTextureFramebuffer,y=n.handleContextLoss;if(g("rawDistances",function(n,g){(e!==n._lastWidth||t!==n._lastHeight)&&i.texImage2D(i.TEXTURE_2D,0,i.RGBA,n._lastWidth=e,n._lastHeight=t,0,i.RGBA,i.UNSIGNED_BYTE,null),m("main","precision highp float;uniform vec4 uGlyphBounds;attribute vec2 aUV;attribute vec4 aLineSegment;varying vec4 vLineSegment;varying vec2 vGlyphXY;void main(){vLineSegment=aLineSegment;vGlyphXY=mix(uGlyphBounds.xy,uGlyphBounds.zw,aUV);gl_Position=vec4(mix(vec2(-1.0),vec2(1.0),aUV),0.0,1.0);}","precision highp float;uniform vec4 uGlyphBounds;uniform float uMaxDistance;uniform float uExponent;varying vec4 vLineSegment;varying vec2 vGlyphXY;float absDistToSegment(vec2 point,vec2 lineA,vec2 lineB){vec2 lineDir=lineB-lineA;float lenSq=dot(lineDir,lineDir);float t=lenSq==0.0 ? 0.0 : clamp(dot(point-lineA,lineDir)/lenSq,0.0,1.0);vec2 linePt=lineA+t*lineDir;return distance(point,linePt);}void main(){vec4 seg=vLineSegment;vec2 p=vGlyphXY;float dist=absDistToSegment(p,seg.xy,seg.zw);float val=pow(1.0-clamp(dist/uMaxDistance,0.0,1.0),uExponent)*0.5;bool crossing=(seg.y>p.y!=seg.w>p.y)&&(p.x<(seg.z-seg.x)*(p.y-seg.y)/(seg.w-seg.y)+seg.x);bool crossingUp=crossing&&vLineSegment.y<vLineSegment.w;gl_FragColor=vec4(crossingUp ? 1.0/255.0 : 0.0,crossing&&!crossingUp ? 1.0/255.0 : 0.0,0.0,val);}",function(r){var u=r.setAttribute,f=r.setUniform,d=!a&&c("ANGLE_instanced_arrays"),h=!a&&c("EXT_blend_minmax");u("aUV",2,i.STATIC_DRAW,0,p),u("aLineSegment",4,i.DYNAMIC_DRAW,1,v),f.apply(void 0,["4f","uGlyphBounds"].concat(o)),f("1f","uMaxDistance",s),f("1f","uExponent",l),b(n,g,function(n){i.enable(i.BLEND),i.colorMask(!0,!0,!0,!0),i.viewport(0,0,e,t),i.scissor(0,0,e,t),i.blendFunc(i.ONE,i.ONE),i.blendEquationSeparate(i.FUNC_ADD,a?i.MAX:h.MAX_EXT),i.clear(i.COLOR_BUFFER_BIT),a?i.drawArraysInstanced(i.TRIANGLES,0,3,v.length/4):d.drawArraysInstancedANGLE(i.TRIANGLES,0,3,v.length/4)})}),m("post",r,"precision highp float;uniform sampler2D tex;varying vec2 vUV;void main(){vec4 color=texture2D(tex,vUV);bool inside=color.r!=color.g;float val=inside ? 1.0-color.a : color.a;gl_FragColor=vec4(val);}",function(n){n.setAttribute("aUV",2,i.STATIC_DRAW,0,p),n.setUniform("1i","tex",g),i.bindFramebuffer(i.FRAMEBUFFER,u),i.disable(i.BLEND),i.colorMask(0===h,1===h,2===h,3===h),i.viewport(f,d,e,t),i.scissor(f,d,e,t),i.drawArrays(i.TRIANGLES,0,3)})}),i.isContextLost())throw y(),Error("webgl context lost")})}function E(e){var t=e&&e!==h?e.canvas||e:m,n=g.get(t);if(void 0===n){v=!0;var r=null;try{var i=[97,106,97,61,99,137,118,80,80,118,137,99,61,97,106,97],o=y(4,4,"M8,8L16,8L24,24L16,24Z",[0,0,32,32],24,1,e);(n=o&&i.length===o.length&&o.every(function(e,t){return e===i[t]}))||(r="bad trial run results",console.info(i,o))}catch(e){n=!1,r=e.message}r&&console.warn("WebGL SDF generation not supported:",r),v=!1,g.set(t,n)}return n}var _=Object.freeze({__proto__:null,generate:y,generateIntoCanvas:w,generateIntoFramebuffer:x,isSupported:E});return e.forEachPathCommand=t,e.generate=function(e,t,n,r,i,o){void 0===i&&(i=Math.max(r[2]-r[0],r[3]-r[1])/2),void 0===o&&(o=1);try{return y.apply(_,arguments)}catch(e){return console.info("WebGL SDF generation failed, falling back to JS",e),c.apply(d,arguments)}},e.generateIntoCanvas=function(e,t,n,r,i,o,a,s,l,c){void 0===i&&(i=Math.max(r[2]-r[0],r[3]-r[1])/2),void 0===o&&(o=1),void 0===s&&(s=0),void 0===l&&(l=0),void 0===c&&(c=0);try{return w.apply(_,arguments)}catch(e){return console.info("WebGL SDF generation failed, falling back to JS",e),u.apply(d,arguments)}},e.javascript=d,e.pathToLineSegments=n,e.webgl=_,e.webglUtils=l,Object.defineProperty(e,"__esModule",{value:!0}),e}({})}},6764:(e,t,n)=>{n.d(t,{N:()=>m});var r=n(3933),i=n(1671),o=n(4908),a=n(5903),s=Object.defineProperty;class l{constructor(){((e,t,n)=>((e,t,n)=>t in e?s(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n)(e,"symbol"!=typeof t?t+"":t,n))(this,"_listeners")}addEventListener(e,t){void 0===this._listeners&&(this._listeners={});let n=this._listeners;void 0===n[e]&&(n[e]=[]),-1===n[e].indexOf(t)&&n[e].push(t)}hasEventListener(e,t){if(void 0===this._listeners)return!1;let n=this._listeners;return void 0!==n[e]&&-1!==n[e].indexOf(t)}removeEventListener(e,t){if(void 0===this._listeners)return;let n=this._listeners[e];if(void 0!==n){let e=n.indexOf(t);-1!==e&&n.splice(e,1)}}dispatchEvent(e){if(void 0===this._listeners)return;let t=this._listeners[e.type];if(void 0!==t){e.target=this;let n=t.slice(0);for(let t=0,r=n.length;t<r;t++)n[t].call(this,e);e.target=null}}}var c=Object.defineProperty,u=(e,t,n)=>(((e,t,n)=>t in e?c(e,t,{enumerable:!0,configurable:!0,writable:!0,value:n}):e[t]=n)(e,"symbol"!=typeof t?t+"":t,n),n);let f=new a.RlV,d=new a.Zcv,p=Math.cos(Math.PI/180*70),h=(e,t)=>(e%t+t)%t;class v extends l{constructor(e,t){super(),u(this,"object"),u(this,"domElement"),u(this,"enabled",!0),u(this,"target",new a.Pq0),u(this,"minDistance",0),u(this,"maxDistance",1/0),u(this,"minZoom",0),u(this,"maxZoom",1/0),u(this,"minPolarAngle",0),u(this,"maxPolarAngle",Math.PI),u(this,"minAzimuthAngle",-1/0),u(this,"maxAzimuthAngle",1/0),u(this,"enableDamping",!1),u(this,"dampingFactor",.05),u(this,"enableZoom",!0),u(this,"zoomSpeed",1),u(this,"enableRotate",!0),u(this,"rotateSpeed",1),u(this,"enablePan",!0),u(this,"panSpeed",1),u(this,"screenSpacePanning",!0),u(this,"keyPanSpeed",7),u(this,"zoomToCursor",!1),u(this,"autoRotate",!1),u(this,"autoRotateSpeed",2),u(this,"reverseOrbit",!1),u(this,"reverseHorizontalOrbit",!1),u(this,"reverseVerticalOrbit",!1),u(this,"keys",{LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"}),u(this,"mouseButtons",{LEFT:a.kBv.ROTATE,MIDDLE:a.kBv.DOLLY,RIGHT:a.kBv.PAN}),u(this,"touches",{ONE:a.wtR.ROTATE,TWO:a.wtR.DOLLY_PAN}),u(this,"target0"),u(this,"position0"),u(this,"zoom0"),u(this,"_domElementKeyEvents",null),u(this,"getPolarAngle"),u(this,"getAzimuthalAngle"),u(this,"setPolarAngle"),u(this,"setAzimuthalAngle"),u(this,"getDistance"),u(this,"getZoomScale"),u(this,"listenToKeyEvents"),u(this,"stopListenToKeyEvents"),u(this,"saveState"),u(this,"reset"),u(this,"update"),u(this,"connect"),u(this,"dispose"),u(this,"dollyIn"),u(this,"dollyOut"),u(this,"getScale"),u(this,"setScale"),this.object=e,this.domElement=t,this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this.getPolarAngle=()=>v.phi,this.getAzimuthalAngle=()=>v.theta,this.setPolarAngle=e=>{let t=h(e,2*Math.PI),r=v.phi;r<0&&(r+=2*Math.PI),t<0&&(t+=2*Math.PI);let i=Math.abs(t-r);2*Math.PI-i<i&&(t<r?t+=2*Math.PI:r+=2*Math.PI),m.phi=t-r,n.update()},this.setAzimuthalAngle=e=>{let t=h(e,2*Math.PI),r=v.theta;r<0&&(r+=2*Math.PI),t<0&&(t+=2*Math.PI);let i=Math.abs(t-r);2*Math.PI-i<i&&(t<r?t+=2*Math.PI:r+=2*Math.PI),m.theta=t-r,n.update()},this.getDistance=()=>n.object.position.distanceTo(n.target),this.listenToKeyEvents=e=>{e.addEventListener("keydown",ee),this._domElementKeyEvents=e},this.stopListenToKeyEvents=()=>{this._domElementKeyEvents.removeEventListener("keydown",ee),this._domElementKeyEvents=null},this.saveState=()=>{n.target0.copy(n.target),n.position0.copy(n.object.position),n.zoom0=n.object.zoom},this.reset=()=>{n.target.copy(n.target0),n.object.position.copy(n.position0),n.object.zoom=n.zoom0,n.object.updateProjectionMatrix(),n.dispatchEvent(r),n.update(),l=s.NONE},this.update=(()=>{let t=new a.Pq0,i=new a.Pq0(0,1,0),o=new a.PTz().setFromUnitVectors(e.up,i),u=o.clone().invert(),h=new a.Pq0,y=new a.PTz,w=2*Math.PI;return function(){let x=n.object.position;o.setFromUnitVectors(e.up,i),u.copy(o).invert(),t.copy(x).sub(n.target),t.applyQuaternion(o),v.setFromVector3(t),n.autoRotate&&l===s.NONE&&k(2*Math.PI/60/60*n.autoRotateSpeed),n.enableDamping?(v.theta+=m.theta*n.dampingFactor,v.phi+=m.phi*n.dampingFactor):(v.theta+=m.theta,v.phi+=m.phi);let E=n.minAzimuthAngle,_=n.maxAzimuthAngle;isFinite(E)&&isFinite(_)&&(E<-Math.PI?E+=w:E>Math.PI&&(E-=w),_<-Math.PI?_+=w:_>Math.PI&&(_-=w),E<=_?v.theta=Math.max(E,Math.min(_,v.theta)):v.theta=v.theta>(E+_)/2?Math.max(E,v.theta):Math.min(_,v.theta)),v.phi=Math.max(n.minPolarAngle,Math.min(n.maxPolarAngle,v.phi)),v.makeSafe(),!0===n.enableDamping?n.target.addScaledVector(b,n.dampingFactor):n.target.add(b),n.zoomToCursor&&P||n.object.isOrthographicCamera?v.radius=N(v.radius):v.radius=N(v.radius*g),t.setFromSpherical(v),t.applyQuaternion(u),x.copy(n.target).add(t),n.object.matrixAutoUpdate||n.object.updateMatrix(),n.object.lookAt(n.target),!0===n.enableDamping?(m.theta*=1-n.dampingFactor,m.phi*=1-n.dampingFactor,b.multiplyScalar(1-n.dampingFactor)):(m.set(0,0,0),b.set(0,0,0));let S=!1;if(n.zoomToCursor&&P){let r=null;if(n.object instanceof a.ubm&&n.object.isPerspectiveCamera){let e=t.length();r=N(e*g);let i=e-r;n.object.position.addScaledVector(L,i),n.object.updateMatrixWorld()}else if(n.object.isOrthographicCamera){let e=new a.Pq0(T.x,T.y,0);e.unproject(n.object),n.object.zoom=Math.max(n.minZoom,Math.min(n.maxZoom,n.object.zoom/g)),n.object.updateProjectionMatrix(),S=!0;let i=new a.Pq0(T.x,T.y,0);i.unproject(n.object),n.object.position.sub(i).add(e),n.object.updateMatrixWorld(),r=t.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),n.zoomToCursor=!1;null!==r&&(n.screenSpacePanning?n.target.set(0,0,-1).transformDirection(n.object.matrix).multiplyScalar(r).add(n.object.position):(f.origin.copy(n.object.position),f.direction.set(0,0,-1).transformDirection(n.object.matrix),Math.abs(n.object.up.dot(f.direction))<p?e.lookAt(n.target):(d.setFromNormalAndCoplanarPoint(n.object.up,n.target),f.intersectPlane(d,n.target))))}else n.object instanceof a.qUd&&n.object.isOrthographicCamera&&(S=1!==g)&&(n.object.zoom=Math.max(n.minZoom,Math.min(n.maxZoom,n.object.zoom/g)),n.object.updateProjectionMatrix());return g=1,P=!1,!!(S||h.distanceToSquared(n.object.position)>c||8*(1-y.dot(n.object.quaternion))>c)&&(n.dispatchEvent(r),h.copy(n.object.position),y.copy(n.object.quaternion),S=!1,!0)}})(),this.connect=e=>{n.domElement=e,n.domElement.style.touchAction="none",n.domElement.addEventListener("contextmenu",et),n.domElement.addEventListener("pointerdown",$),n.domElement.addEventListener("pointercancel",Q),n.domElement.addEventListener("wheel",J)},this.dispose=()=>{var e,t,r,i,o,a;n.domElement&&(n.domElement.style.touchAction="auto"),null==(e=n.domElement)||e.removeEventListener("contextmenu",et),null==(t=n.domElement)||t.removeEventListener("pointerdown",$),null==(r=n.domElement)||r.removeEventListener("pointercancel",Q),null==(i=n.domElement)||i.removeEventListener("wheel",J),null==(o=n.domElement)||o.ownerDocument.removeEventListener("pointermove",Z),null==(a=n.domElement)||a.ownerDocument.removeEventListener("pointerup",Q),null!==n._domElementKeyEvents&&n._domElementKeyEvents.removeEventListener("keydown",ee)};let n=this,r={type:"change"},i={type:"start"},o={type:"end"},s={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},l=s.NONE,c=1e-6,v=new a.YHV,m=new a.YHV,g=1,b=new a.Pq0,y=new a.I9Y,w=new a.I9Y,x=new a.I9Y,E=new a.I9Y,_=new a.I9Y,S=new a.I9Y,M=new a.I9Y,A=new a.I9Y,O=new a.I9Y,L=new a.Pq0,T=new a.I9Y,P=!1,D=[],C={};function R(){return Math.pow(.95,n.zoomSpeed)}function k(e){n.reverseOrbit||n.reverseHorizontalOrbit?m.theta+=e:m.theta-=e}function I(e){n.reverseOrbit||n.reverseVerticalOrbit?m.phi+=e:m.phi-=e}let j=(()=>{let e=new a.Pq0;return function(t,n){e.setFromMatrixColumn(n,0),e.multiplyScalar(-t),b.add(e)}})(),z=(()=>{let e=new a.Pq0;return function(t,r){!0===n.screenSpacePanning?e.setFromMatrixColumn(r,1):(e.setFromMatrixColumn(r,0),e.crossVectors(n.object.up,e)),e.multiplyScalar(t),b.add(e)}})(),U=(()=>{let e=new a.Pq0;return function(t,r){let i=n.domElement;if(i&&n.object instanceof a.ubm&&n.object.isPerspectiveCamera){let o=n.object.position;e.copy(o).sub(n.target);let a=e.length();j(2*t*(a*=Math.tan(n.object.fov/2*Math.PI/180))/i.clientHeight,n.object.matrix),z(2*r*a/i.clientHeight,n.object.matrix)}else i&&n.object instanceof a.qUd&&n.object.isOrthographicCamera?(j(t*(n.object.right-n.object.left)/n.object.zoom/i.clientWidth,n.object.matrix),z(r*(n.object.top-n.object.bottom)/n.object.zoom/i.clientHeight,n.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),n.enablePan=!1)}})();function B(e){n.object instanceof a.ubm&&n.object.isPerspectiveCamera||n.object instanceof a.qUd&&n.object.isOrthographicCamera?g=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),n.enableZoom=!1)}function F(e){if(!n.zoomToCursor||!n.domElement)return;P=!0;let t=n.domElement.getBoundingClientRect(),r=e.clientX-t.left,i=e.clientY-t.top,o=t.width,a=t.height;T.x=r/o*2-1,T.y=-(i/a*2)+1,L.set(T.x,T.y,1).unproject(n.object).sub(n.object.position).normalize()}function N(e){return Math.max(n.minDistance,Math.min(n.maxDistance,e))}function Y(e){y.set(e.clientX,e.clientY)}function H(e){E.set(e.clientX,e.clientY)}function q(){if(1==D.length)y.set(D[0].pageX,D[0].pageY);else{let e=.5*(D[0].pageX+D[1].pageX),t=.5*(D[0].pageY+D[1].pageY);y.set(e,t)}}function G(){if(1==D.length)E.set(D[0].pageX,D[0].pageY);else{let e=.5*(D[0].pageX+D[1].pageX),t=.5*(D[0].pageY+D[1].pageY);E.set(e,t)}}function W(){let e=D[0].pageX-D[1].pageX,t=D[0].pageY-D[1].pageY,n=Math.sqrt(e*e+t*t);M.set(0,n)}function X(e){if(1==D.length)w.set(e.pageX,e.pageY);else{let t=er(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);w.set(n,r)}x.subVectors(w,y).multiplyScalar(n.rotateSpeed);let t=n.domElement;t&&(k(2*Math.PI*x.x/t.clientHeight),I(2*Math.PI*x.y/t.clientHeight)),y.copy(w)}function V(e){if(1==D.length)_.set(e.pageX,e.pageY);else{let t=er(e),n=.5*(e.pageX+t.x),r=.5*(e.pageY+t.y);_.set(n,r)}S.subVectors(_,E).multiplyScalar(n.panSpeed),U(S.x,S.y),E.copy(_)}function K(e){var t;let r=er(e),i=e.pageX-r.x,o=e.pageY-r.y,a=Math.sqrt(i*i+o*o);A.set(0,a),O.set(0,Math.pow(A.y/M.y,n.zoomSpeed)),t=O.y,B(g/t),M.copy(A)}function $(e){var t,r,o;!1!==n.enabled&&(0===D.length&&(null==(t=n.domElement)||t.ownerDocument.addEventListener("pointermove",Z),null==(r=n.domElement)||r.ownerDocument.addEventListener("pointerup",Q)),o=e,D.push(o),"touch"===e.pointerType?function(e){switch(en(e),D.length){case 1:switch(n.touches.ONE){case a.wtR.ROTATE:if(!1===n.enableRotate)return;q(),l=s.TOUCH_ROTATE;break;case a.wtR.PAN:if(!1===n.enablePan)return;G(),l=s.TOUCH_PAN;break;default:l=s.NONE}break;case 2:switch(n.touches.TWO){case a.wtR.DOLLY_PAN:if(!1===n.enableZoom&&!1===n.enablePan)return;n.enableZoom&&W(),n.enablePan&&G(),l=s.TOUCH_DOLLY_PAN;break;case a.wtR.DOLLY_ROTATE:if(!1===n.enableZoom&&!1===n.enableRotate)return;n.enableZoom&&W(),n.enableRotate&&q(),l=s.TOUCH_DOLLY_ROTATE;break;default:l=s.NONE}break;default:l=s.NONE}l!==s.NONE&&n.dispatchEvent(i)}(e):function(e){let t;switch(e.button){case 0:t=n.mouseButtons.LEFT;break;case 1:t=n.mouseButtons.MIDDLE;break;case 2:t=n.mouseButtons.RIGHT;break;default:t=-1}switch(t){case a.kBv.DOLLY:if(!1===n.enableZoom)return;F(e),M.set(e.clientX,e.clientY),l=s.DOLLY;break;case a.kBv.ROTATE:if(e.ctrlKey||e.metaKey||e.shiftKey){if(!1===n.enablePan)return;H(e),l=s.PAN}else{if(!1===n.enableRotate)return;Y(e),l=s.ROTATE}break;case a.kBv.PAN:if(e.ctrlKey||e.metaKey||e.shiftKey){if(!1===n.enableRotate)return;Y(e),l=s.ROTATE}else{if(!1===n.enablePan)return;H(e),l=s.PAN}break;default:l=s.NONE}l!==s.NONE&&n.dispatchEvent(i)}(e))}function Z(e){!1!==n.enabled&&("touch"===e.pointerType?function(e){switch(en(e),l){case s.TOUCH_ROTATE:if(!1===n.enableRotate)return;X(e),n.update();break;case s.TOUCH_PAN:if(!1===n.enablePan)return;V(e),n.update();break;case s.TOUCH_DOLLY_PAN:if(!1===n.enableZoom&&!1===n.enablePan)return;n.enableZoom&&K(e),n.enablePan&&V(e),n.update();break;case s.TOUCH_DOLLY_ROTATE:if(!1===n.enableZoom&&!1===n.enableRotate)return;n.enableZoom&&K(e),n.enableRotate&&X(e),n.update();break;default:l=s.NONE}}(e):function(e){if(!1!==n.enabled)switch(l){case s.ROTATE:if(!1===n.enableRotate)return;w.set(e.clientX,e.clientY),x.subVectors(w,y).multiplyScalar(n.rotateSpeed);let t=n.domElement;t&&(k(2*Math.PI*x.x/t.clientHeight),I(2*Math.PI*x.y/t.clientHeight)),y.copy(w),n.update();break;case s.DOLLY:var r,i;if(!1===n.enableZoom)return;(A.set(e.clientX,e.clientY),O.subVectors(A,M),O.y>0)?(r=R(),B(g/r)):O.y<0&&(i=R(),B(g*i)),M.copy(A),n.update();break;case s.PAN:if(!1===n.enablePan)return;_.set(e.clientX,e.clientY),S.subVectors(_,E).multiplyScalar(n.panSpeed),U(S.x,S.y),E.copy(_),n.update()}}(e))}function Q(e){var t,r,i;(function(e){delete C[e.pointerId];for(let t=0;t<D.length;t++)if(D[t].pointerId==e.pointerId)return void D.splice(t,1)})(e),0===D.length&&(null==(t=n.domElement)||t.releasePointerCapture(e.pointerId),null==(r=n.domElement)||r.ownerDocument.removeEventListener("pointermove",Z),null==(i=n.domElement)||i.ownerDocument.removeEventListener("pointerup",Q)),n.dispatchEvent(o),l=s.NONE}function J(e){if(!1!==n.enabled&&!1!==n.enableZoom&&(l===s.NONE||l===s.ROTATE)){var t,r;e.preventDefault(),n.dispatchEvent(i),(F(e),e.deltaY<0)?(t=R(),B(g*t)):e.deltaY>0&&(r=R(),B(g/r)),n.update(),n.dispatchEvent(o)}}function ee(e){if(!1!==n.enabled&&!1!==n.enablePan){let t=!1;switch(e.code){case n.keys.UP:U(0,n.keyPanSpeed),t=!0;break;case n.keys.BOTTOM:U(0,-n.keyPanSpeed),t=!0;break;case n.keys.LEFT:U(n.keyPanSpeed,0),t=!0;break;case n.keys.RIGHT:U(-n.keyPanSpeed,0),t=!0}t&&(e.preventDefault(),n.update())}}function et(e){!1!==n.enabled&&e.preventDefault()}function en(e){let t=C[e.pointerId];void 0===t&&(t=new a.I9Y,C[e.pointerId]=t),t.set(e.pageX,e.pageY)}function er(e){return C[(e.pointerId===D[0].pointerId?D[1]:D[0]).pointerId]}this.dollyIn=(e=R())=>{B(g*e),n.update()},this.dollyOut=(e=R())=>{B(g/e),n.update()},this.getScale=()=>g,this.setScale=e=>{B(e),n.update()},this.getZoomScale=()=>R(),void 0!==t&&this.connect(t),this.update()}}let m=o.forwardRef(({makeDefault:e,camera:t,regress:n,domElement:a,enableDamping:s=!0,keyEvents:l=!1,onChange:c,onStart:u,onEnd:f,...d},p)=>{let h=(0,i.D)(e=>e.invalidate),m=(0,i.D)(e=>e.camera),g=(0,i.D)(e=>e.gl),b=(0,i.D)(e=>e.events),y=(0,i.D)(e=>e.setEvents),w=(0,i.D)(e=>e.set),x=(0,i.D)(e=>e.get),E=(0,i.D)(e=>e.performance),_=t||m,S=a||b.connected||g.domElement,M=o.useMemo(()=>new v(_),[_]);return(0,i.F)(()=>{M.enabled&&M.update()},-1),o.useEffect(()=>(l&&M.connect(!0===l?S:l),M.connect(S),()=>void M.dispose()),[l,S,n,M,h]),o.useEffect(()=>{let e=e=>{h(),n&&E.regress(),c&&c(e)},t=e=>{u&&u(e)},r=e=>{f&&f(e)};return M.addEventListener("change",e),M.addEventListener("start",t),M.addEventListener("end",r),()=>{M.removeEventListener("start",t),M.removeEventListener("end",r),M.removeEventListener("change",e)}},[c,u,f,M,h,y]),o.useEffect(()=>{if(e){let e=x().controls;return w({controls:M}),()=>w({controls:e})}},[e,M]),o.createElement("primitive",(0,r.A)({ref:p,object:M,enableDamping:s},d))})},6963:(e,t,n)=>{e.exports=n(160)},7488:(e,t,n)=>{n.d(t,{Af:()=>s,Go:()=>d,Nz:()=>i,u5:()=>l,y3:()=>f});var r=n(4908);function i(e,t,n){if(!e)return;if(!0===n(e))return e;let r=t?e.return:e.child;for(;r;){let e=i(r,t,n);if(e)return e;r=t?null:r.sibling}}function o(e){try{return Object.defineProperties(e,{_currentRenderer:{get:()=>null,set(){}},_currentRenderer2:{get:()=>null,set(){}}})}catch(t){return e}}(()=>{var e,t;return"undefined"!=typeof window&&((null==(e=window.document)?void 0:e.createElement)||(null==(t=window.navigator)?void 0:t.product)==="ReactNative")})()?r.useLayoutEffect:r.useEffect;let a=o(r.createContext(null));class s extends r.Component{render(){return r.createElement(a.Provider,{value:this._reactInternals},this.props.children)}}function l(){let e=r.useContext(a);if(null===e)throw Error("its-fine: useFiber must be called within a <FiberProvider />!");let t=r.useId();return r.useMemo(()=>{for(let n of[e,null==e?void 0:e.alternate]){if(!n)continue;let e=i(n,!1,e=>{let n=e.memoizedState;for(;n;){if(n.memoizedState===t)return!0;n=n.next}});if(e)return e}},[e,t])}let c=Symbol.for("react.context"),u=e=>null!==e&&"object"==typeof e&&"$$typeof"in e&&e.$$typeof===c;function f(){let e=function(){let e=l(),[t]=r.useState(()=>new Map);t.clear();let n=e;for(;n;){let e=n.type;u(e)&&e!==a&&!t.has(e)&&t.set(e,r.use(o(e))),n=n.return}return t}();return r.useMemo(()=>Array.from(e.keys()).reduce((t,n)=>i=>r.createElement(t,null,r.createElement(n.Provider,{...i,value:e.get(n)})),e=>r.createElement(s,{...e})),[e])}function d(){if(!r.Activity)throw Error("its-fine: useActivityBridge requires React 19.2 or later!");let e=l(),[t]=r.useState(()=>{let t,n=[],o=!1;i(e,!0,e=>{var t,i;if(e.elementType===r.Activity){let r=(null==(t=e.child)?void 0:t.tag)===22?e.child.stateNode:null;if("number"!=typeof(null==r?void 0:r._visibility))throw Error("its-fine: unsupported React Activity internals!");n.push(r)}else 22===e.tag&&(null==(i=e.return)?void 0:i.elementType)!==r.Activity&&(o=!0)});let a="hidden",s=new Set,l={mounted:!1,connected:!1,subscribe:e=>(s.add(e),()=>{s.delete(e)}),sync(e){l.mounted&&!l.connected&&o&&n.length>0?t||(t=function(e){if("function"==typeof requestAnimationFrame){let t=requestAnimationFrame(e);return()=>cancelAnimationFrame(t)}let t=setTimeout(e,16);return()=>clearTimeout(t)}(()=>{t=void 0,l.sync(!0)})):(null==t||t(),t=void 0);let r=a;if(l.mounted?l.connected?r="visible":e&&(r=n.every(e=>(1&e._visibility)!=0)?"visible":"hidden"):r="hidden",a!==r)for(let e of(a=r,s))e()},Bridge:({children:e})=>r.createElement(r.Activity,{mode:r.useSyncExternalStore(l.subscribe,()=>a,()=>"hidden")},e)};return l});return r.useInsertionEffect(()=>(t.mounted=!0,queueMicrotask(()=>t.sync(!1)),()=>{t.mounted=!1,queueMicrotask(()=>t.sync(!1))}),[t]),r.useLayoutEffect(()=>(t.connected=!0,t.sync(!1),()=>{t.connected=!1,t.sync(!0)}),[t]),t.Bridge}},8288:(e,t,n)=>{var r=n(4908),i=n(1600),o="function"==typeof Object.is?Object.is:function(e,t){return e===t&&(0!==e||1/e==1/t)||e!=e&&t!=t},a=i.useSyncExternalStore,s=r.useRef,l=r.useEffect,c=r.useMemo,u=r.useDebugValue;t.useSyncExternalStoreWithSelector=function(e,t,n,r,i){var f=s(null);if(null===f.current){var d={hasValue:!1,value:null};f.current=d}else d=f.current;var p=a(e,(f=c(function(){function e(e){if(!l){if(l=!0,a=e,e=r(e),void 0!==i&&d.hasValue){var t=d.value;if(i(t,e))return s=t}return s=e}if(t=s,o(a,e))return t;var n=r(e);return void 0!==i&&i(t,n)?(a=e,t):(a=e,s=n)}var a,s,l=!1,c=void 0===n?null:n;return[function(){return e(t())},null===c?void 0:function(){return e(c())}]},[t,n,r,i]))[0],f[1]);return l(function(){d.hasValue=!0,d.value=p},[p]),u(p),p}},8454:(e,t,n)=>{e.exports=n(8288)},8909:(e,t,n)=>{n.d(t,{Ay:()=>ex});var r,i,o,a,s,l,c,u=n(695),f={},d=180/Math.PI,p=Math.PI/180,h=Math.atan2,v=/([A-Z])/g,m=/(left|right|width|margin|padding|x)/i,g=/[\s,\(]\S/,b={autoAlpha:"opacity,visibility",scale:"scaleX,scaleY",alpha:"opacity"},y=function(e,t){return t.set(t.t,t.p,Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},w=function(e,t){return t.set(t.t,t.p,1===e?t.e:Math.round((t.s+t.c*e)*1e4)/1e4+t.u,t)},x=function(e,t){return t.set(t.t,t.p,e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},E=function(e,t){return t.set(t.t,t.p,1===e?t.e:e?Math.round((t.s+t.c*e)*1e4)/1e4+t.u:t.b,t)},_=function(e,t){var n=t.s+t.c*e;t.set(t.t,t.p,~~(n+(n<0?-.5:.5))+t.u,t)},S=function(e,t){return t.set(t.t,t.p,e?t.e:t.b,t)},M=function(e,t){return t.set(t.t,t.p,1!==e?t.b:t.e,t)},A=function(e,t,n){return e.style[t]=n},O=function(e,t,n){return e.style.setProperty(t,n)},L=function(e,t,n){return e._gsap[t]=n},T=function(e,t,n){return e._gsap.scaleX=e._gsap.scaleY=n},P=function(e,t,n,r,i){var o=e._gsap;o.scaleX=o.scaleY=n,o.renderTransform(i,o)},D=function(e,t,n,r,i){var o=e._gsap;o[t]=n,o.renderTransform(i,o)},C="transform",R=C+"Origin",k=function e(t,n){var r=this,i=this.target,o=i.style,a=i._gsap;if(t in f&&o){if(this.tfm=this.tfm||{},"transform"===t)return b.transform.split(",").forEach(function(t){return e.call(r,t,n)});if(~(t=b[t]||t).indexOf(",")?t.split(",").forEach(function(e){return r.tfm[e]=Q(i,e)}):this.tfm[t]=a.x?a[t]:Q(i,t),t===R&&(this.tfm.zOrigin=a.zOrigin),this.props.indexOf(C)>=0)return;a.svg&&(this.svgo=i.getAttribute("data-svg-origin"),this.props.push(R,n,"")),t=C}(o||n)&&this.props.push(t,n,o[t])},I=function(e){e.translate&&(e.removeProperty("translate"),e.removeProperty("scale"),e.removeProperty("rotate"))},j=function(){var e,t,n=this.props,r=this.target,i=r.style,o=r._gsap;for(e=0;e<n.length;e+=3)n[e+1]?2===n[e+1]?r[n[e]](n[e+2]):r[n[e]]=n[e+2]:n[e+2]?i[n[e]]=n[e+2]:i.removeProperty("--"===n[e].substr(0,2)?n[e]:n[e].replace(v,"-$1").toLowerCase());if(this.tfm){for(t in this.tfm)o[t]=this.tfm[t];o.svg&&(o.renderTransform(),r.setAttribute("data-svg-origin",this.svgo||"")),(e=l())&&e.isStart||i[C]||(I(i),o.zOrigin&&i[R]&&(i[R]+=" "+o.zOrigin+"px",o.zOrigin=0,o.renderTransform()),o.uncache=1)}},z=function(e,t){var n={target:e,props:[],revert:j,save:k};return e._gsap||u.os.core.getCache(e),t&&e.style&&e.nodeType&&t.split(",").forEach(function(e){return n.save(e)}),n},U=function(e,t){var n=r.createElementNS?r.createElementNS((t||"http://www.w3.org/1999/xhtml").replace(/^https/,"http"),e):r.createElement(e);return n&&n.style?n:r.createElement(e)},B=function e(t,n,r){var i=getComputedStyle(t);return i[n]||i.getPropertyValue(n.replace(v,"-$1").toLowerCase())||i.getPropertyValue(n)||!r&&e(t,N(n)||n,1)||""},F="O,Moz,ms,Ms,Webkit".split(","),N=function(e,t,n){var r=(t||a).style,i=5;if(e in r&&!n)return e;for(e=e.charAt(0).toUpperCase()+e.substr(1);i--&&!(F[i]+e in r););return i<0?null:(3===i?"ms":i>=0?F[i]:"")+e},Y=function(){"undefined"!=typeof window&&window.document&&(i=(r=window.document).documentElement,a=U("div")||{style:{}},U("div"),R=(C=N(C))+"Origin",a.style.cssText="border-width:0;line-height:0;position:absolute;padding:0",c=!!N("perspective"),l=u.os.core.reverting,o=1)},H=function(e){var t,n=e.ownerSVGElement,r=U("svg",n&&n.getAttribute("xmlns")||"http://www.w3.org/2000/svg"),o=e.cloneNode(!0);o.style.display="block",r.appendChild(o),i.appendChild(r);try{t=o.getBBox()}catch(e){}return r.removeChild(o),i.removeChild(r),t},q=function(e,t){for(var n=t.length;n--;)if(e.hasAttribute(t[n]))return e.getAttribute(t[n])},G=function(e){var t,n;try{t=e.getBBox()}catch(r){t=H(e),n=1}return t&&(t.width||t.height)||n||(t=H(e)),!t||t.width||t.x||t.y?t:{x:+q(e,["x","cx","x1"])||0,y:+q(e,["y","cy","y1"])||0,width:0,height:0}},W=function(e){return!!(e.getCTM&&(!e.parentNode||e.ownerSVGElement)&&G(e))},X=function(e,t){if(t){var n,r=e.style;t in f&&t!==R&&(t=C),r.removeProperty?(("ms"===(n=t.substr(0,2))||"webkit"===t.substr(0,6))&&(t="-"+t),r.removeProperty("--"===n?t:t.replace(v,"-$1").toLowerCase())):r.removeAttribute(t)}},V=function(e,t,n,r,i,o){var a=new u.J7(e._pt,t,n,0,1,o?M:S);return e._pt=a,a.b=r,a.e=i,e._props.push(n),a},K={deg:1,rad:1,turn:1},$={grid:1,flex:1},Z=function e(t,n,i,o){var s,l,c,d,p=parseFloat(i)||0,h=(i+"").trim().substr((p+"").length)||"px",v=a.style,g=m.test(n),b="svg"===t.tagName.toLowerCase(),y=(b?"client":"offset")+(g?"Width":"Height"),w="px"===o,x="%"===o;if(o===h||!p||K[o]||K[h])return p;if("px"===h||w||(p=e(t,n,i,"px")),d=t.getCTM&&W(t),(x||"%"===h)&&(f[n]||~n.indexOf("adius")))return s=d?t.getBBox()[g?"width":"height"]:t[y],(0,u.E_)(x?p/s*100:p/100*s);if(v[g?"width":"height"]=100+(w?h:o),l="rem"!==o&&~n.indexOf("adius")||"em"===o&&t.appendChild&&!b?t:t.parentNode,d&&(l=(t.ownerSVGElement||{}).parentNode),l&&l!==r&&l.appendChild||(l=r.body),(c=l._gsap)&&x&&c.width&&g&&c.time===u.au.time&&!c.uncache)return(0,u.E_)(p/c.width*100);if(x&&("height"===n||"width"===n)){var E=t.style[n];t.style[n]=100+o,s=t[y],E?t.style[n]=E:X(t,n)}else(x||"%"===h)&&!$[B(l,"display")]&&(v.position=B(t,"position")),l===t&&(v.position="static"),l.appendChild(a),s=a[y],l.removeChild(a),v.position="absolute";return g&&x&&((c=(0,u.a0)(l)).time=u.au.time,c.width=l[y]),(0,u.E_)(w?s*p/100:s&&p?100/s*p:0)},Q=function(e,t,n,r){var i;return o||Y(),t in b&&"transform"!==t&&~(t=b[t]).indexOf(",")&&(t=t.split(",")[0]),f[t]&&"transform"!==t?(i=eu(e,r),i="transformOrigin"!==t?i[t]:i.svg?i.origin:ef(B(e,R))+" "+i.zOrigin+"px"):(!(i=e.style[t])||"auto"===i||r||~(i+"").indexOf("calc("))&&(i=er[t]&&er[t](e,t,n)||B(e,t)||(0,u.n)(e,t)||+("opacity"===t)),n&&!~(i+"").trim().indexOf(" ")?Z(e,t,i,n)+n:i},J=function(e,t,n,r){if(!n||"none"===n){var i=N(t,e,1),o=i&&B(e,i,1);o&&o!==n?(t=i,n=o):"borderColor"===t&&(n=B(e,"borderTopColor"))}var a,s,l,c,f,d,p,h,v,m,g,b=new u.J7(this._pt,e.style,t,0,1,u.l1),y=0,w=0;if(b.b=n,b.e=r,n+="","var(--"===(r+="").substring(0,6)&&(r=B(e,r.substring(4,r.indexOf(")")))),"auto"===r&&(d=e.style[t],e.style[t]=r,r=B(e,t)||r,d?e.style[t]=d:X(e,t)),a=[n,r],(0,u.Uc)(a),n=a[0],r=a[1],l=n.match(u.vM)||[],(r.match(u.vM)||[]).length){for(;s=u.vM.exec(r);)p=s[0],v=r.substring(y,s.index),f?f=(f+1)%5:("rgba("===v.substr(-5)||"hsla("===v.substr(-5))&&(f=1),p!==(d=l[w++]||"")&&(c=parseFloat(d)||0,g=d.substr((c+"").length),"="===p.charAt(1)&&(p=(0,u.B0)(c,p)+g),h=parseFloat(p),m=p.substr((h+"").length),y=u.vM.lastIndex-m.length,m||(m=m||u.Yz.units[t]||g,y===r.length&&(r+=m,b.e+=m)),g!==m&&(c=Z(e,t,d,m)||0),b._pt={_next:b._pt,p:v||1===w?v:",",s:c,c:h-c,m:f&&f<4||"zIndex"===t?Math.round:0});b.c=y<r.length?r.substring(y,r.length):""}else b.r="display"===t&&"none"===r?M:S;return u.Ks.test(r)&&(b.e=0),this._pt=b,b},ee={top:"0%",bottom:"100%",left:"0%",right:"100%",center:"50%"},et=function(e){var t=e.split(" "),n=t[0],r=t[1]||"50%";return("top"===n||"bottom"===n||"left"===r||"right"===r)&&(e=n,n=r,r=e),t[0]=ee[n]||n,t[1]=ee[r]||r,t.join(" ")},en=function(e,t){if(t.tween&&t.tween._time===t.tween._dur){var n,r,i,o=t.t,a=o.style,s=t.u,l=o._gsap;if("all"===s||!0===s)a.cssText="",r=1;else for(i=(s=s.split(",")).length;--i>-1;)f[n=s[i]]&&(r=1,n="transformOrigin"===n?R:C),X(o,n);r&&(X(o,C),l&&(l.svg&&o.removeAttribute("transform"),a.scale=a.rotate=a.translate="none",eu(o,1),l.uncache=1,I(a)))}},er={clearProps:function(e,t,n,r,i){if("isFromStart"!==i.data){var o=e._pt=new u.J7(e._pt,t,n,0,0,en);return o.u=r,o.pr=-10,o.tween=i,e._props.push(n),1}}},ei=[1,0,0,1,0,0],eo={},ea=function(e){return"matrix(1, 0, 0, 1, 0, 0)"===e||"none"===e||!e},es=function(e){var t=B(e,C);return ea(t)?ei:t.substr(7).match(u.vX).map(u.E_)},el=function(e,t){var n,r,o,a,s=e._gsap||(0,u.a0)(e),l=e.style,c=es(e);return s.svg&&e.getAttribute("transform")?"1,0,0,1,0,0"===(c=[(o=e.transform.baseVal.consolidate().matrix).a,o.b,o.c,o.d,o.e,o.f]).join(",")?ei:c:(c!==ei||e.offsetParent||e===i||s.svg||(o=l.display,l.display="block",(n=e.parentNode)&&(e.offsetParent||e.getBoundingClientRect().width)||(a=1,r=e.nextElementSibling,i.appendChild(e)),c=es(e),o?l.display=o:X(e,"display"),a&&(r?n.insertBefore(e,r):n?n.appendChild(e):i.removeChild(e))),t&&c.length>6?[c[0],c[1],c[4],c[5],c[12],c[13]]:c)},ec=function(e,t,n,r,i,o){var a,s,l,c,u=e._gsap,f=i||el(e,!0),d=u.xOrigin||0,p=u.yOrigin||0,h=u.xOffset||0,v=u.yOffset||0,m=f[0],g=f[1],b=f[2],y=f[3],w=f[4],x=f[5],E=t.split(" "),_=parseFloat(E[0])||0,S=parseFloat(E[1])||0;n?f!==ei&&(s=m*y-g*b)&&(l=y/s*_+-b/s*S+(b*x-y*w)/s,c=-g/s*_+m/s*S-(m*x-g*w)/s,_=l,S=c):(_=(a=G(e)).x+(~E[0].indexOf("%")?_/100*a.width:_),S=a.y+(~(E[1]||E[0]).indexOf("%")?S/100*a.height:S)),r||!1!==r&&u.smooth?(u.xOffset=h+((w=_-d)*m+(x=S-p)*b)-w,u.yOffset=v+(w*g+x*y)-x):u.xOffset=u.yOffset=0,u.xOrigin=_,u.yOrigin=S,u.smooth=!!r,u.origin=t,u.originIsAbsolute=!!n,e.style[R]="0px 0px",o&&(V(o,u,"xOrigin",d,_),V(o,u,"yOrigin",p,S),V(o,u,"xOffset",h,u.xOffset),V(o,u,"yOffset",v,u.yOffset)),e.setAttribute("data-svg-origin",_+" "+S)},eu=function(e,t){var n=e._gsap||new u.n6(e);if("x"in n&&!t&&!n.uncache)return n;var r,i,o,a,s,l,f,v,m,g,b,y,w,x,E,_,S,M,A,O,L,T,P,D,k,I,j,z,U,F,N,Y,H=e.style,q=n.scaleX<0,G=getComputedStyle(e),X=B(e,R)||"0";return r=i=o=l=f=v=m=g=b=0,a=s=1,n.svg=!!(e.getCTM&&W(e)),G.translate&&(("none"!==G.translate||"none"!==G.scale||"none"!==G.rotate)&&(H[C]=("none"!==G.translate?"translate3d("+(G.translate+" 0 0").split(" ").slice(0,3).join(", ")+") ":"")+("none"!==G.rotate?"rotate("+G.rotate+") ":"")+("none"!==G.scale?"scale("+G.scale.split(" ").join(",")+") ":"")+("none"!==G[C]?G[C]:"")),H.scale=H.rotate=H.translate="none"),x=el(e,n.svg),n.svg&&(n.uncache?(k=e.getBBox(),X=n.xOrigin-k.x+"px "+(n.yOrigin-k.y)+"px",D=""):D=!t&&e.getAttribute("data-svg-origin"),ec(e,D||X,!!D||n.originIsAbsolute,!1!==n.smooth,x)),y=n.xOrigin||0,w=n.yOrigin||0,x!==ei&&(M=x[0],A=x[1],O=x[2],L=x[3],r=T=x[4],i=P=x[5],6===x.length?(a=Math.sqrt(M*M+A*A),s=Math.sqrt(L*L+O*O),l=M||A?h(A,M)*d:0,(m=O||L?h(O,L)*d+l:0)&&(s*=Math.abs(Math.cos(m*p))),n.svg&&(r-=y-(y*M+w*O),i-=w-(y*A+w*L))):(Y=x[6],F=x[7],j=x[8],z=x[9],U=x[10],N=x[11],r=x[12],i=x[13],o=x[14],f=(E=h(Y,U))*d,E&&(D=T*(_=Math.cos(-E))+j*(S=Math.sin(-E)),k=P*_+z*S,I=Y*_+U*S,j=-(T*S)+j*_,z=-(P*S)+z*_,U=-(Y*S)+U*_,N=-(F*S)+N*_,T=D,P=k,Y=I),v=(E=h(-O,U))*d,E&&(D=M*(_=Math.cos(-E))-j*(S=Math.sin(-E)),k=A*_-z*S,I=O*_-U*S,N=L*S+N*_,M=D,A=k,O=I),l=(E=h(A,M))*d,E&&(D=M*(_=Math.cos(E))+A*(S=Math.sin(E)),k=T*_+P*S,A=A*_-M*S,P=P*_-T*S,M=D,T=k),f&&Math.abs(f)+Math.abs(l)>359.9&&(f=l=0,v=180-v),a=(0,u.E_)(Math.sqrt(M*M+A*A+O*O)),s=(0,u.E_)(Math.sqrt(P*P+Y*Y)),m=Math.abs(E=h(T,P))>2e-4?E*d:0,b=N?1/(N<0?-N:N):0),n.svg&&(D=e.getAttribute("transform"),n.forceCSS=e.setAttribute("transform","")||!ea(B(e,C)),D&&e.setAttribute("transform",D))),Math.abs(m)>90&&270>Math.abs(m)&&(q?(a*=-1,m+=l<=0?180:-180,l+=l<=0?180:-180):(s*=-1,m+=m<=0?180:-180)),t=t||n.uncache,n.x=r-((n.xPercent=r&&(!t&&n.xPercent||(Math.round(e.offsetWidth/2)===Math.round(-r)?-50:0)))?e.offsetWidth*n.xPercent/100:0)+"px",n.y=i-((n.yPercent=i&&(!t&&n.yPercent||(Math.round(e.offsetHeight/2)===Math.round(-i)?-50:0)))?e.offsetHeight*n.yPercent/100:0)+"px",n.z=o+"px",n.scaleX=(0,u.E_)(a),n.scaleY=(0,u.E_)(s),n.rotation=(0,u.E_)(l)+"deg",n.rotationX=(0,u.E_)(f)+"deg",n.rotationY=(0,u.E_)(v)+"deg",n.skewX=m+"deg",n.skewY=g+"deg",n.transformPerspective=b+"px",(n.zOrigin=parseFloat(X.split(" ")[2])||!t&&n.zOrigin||0)&&(H[R]=ef(X)),n.xOffset=n.yOffset=0,n.force3D=u.Yz.force3D,n.renderTransform=n.svg?em:c?ev:ep,n.uncache=0,n},ef=function(e){return(e=e.split(" "))[0]+" "+e[1]},ed=function(e,t,n){var r=(0,u.l_)(t);return(0,u.E_)(parseFloat(t)+parseFloat(Z(e,"x",n+"px",r)))+r},ep=function(e,t){t.z="0px",t.rotationY=t.rotationX="0deg",t.force3D=0,ev(e,t)},eh="0deg",ev=function(e,t){var n=t||this,r=n.xPercent,i=n.yPercent,o=n.x,a=n.y,s=n.z,l=n.rotation,c=n.rotationY,u=n.rotationX,f=n.skewX,d=n.skewY,h=n.scaleX,v=n.scaleY,m=n.transformPerspective,g=n.force3D,b=n.target,y=n.zOrigin,w="",x="auto"===g&&e&&1!==e||!0===g;if(y&&(u!==eh||c!==eh)){var E,_=parseFloat(c)*p,S=Math.sin(_),M=Math.cos(_);o=ed(b,o,-(S*(E=Math.cos(_=parseFloat(u)*p))*y)),a=ed(b,a,-(-Math.sin(_)*y)),s=ed(b,s,-(M*E*y)+y)}"0px"!==m&&(w+="perspective("+m+") "),(r||i)&&(w+="translate("+r+"%, "+i+"%) "),(x||"0px"!==o||"0px"!==a||"0px"!==s)&&(w+="0px"!==s||x?"translate3d("+o+", "+a+", "+s+") ":"translate("+o+", "+a+") "),l!==eh&&(w+="rotate("+l+") "),c!==eh&&(w+="rotateY("+c+") "),u!==eh&&(w+="rotateX("+u+") "),(f!==eh||d!==eh)&&(w+="skew("+f+", "+d+") "),(1!==h||1!==v)&&(w+="scale("+h+", "+v+") "),b.style[C]=w||"translate(0, 0)"},em=function(e,t){var n,r,i,o,a,s=t||this,l=s.xPercent,c=s.yPercent,f=s.x,d=s.y,h=s.rotation,v=s.skewX,m=s.skewY,g=s.scaleX,b=s.scaleY,y=s.target,w=s.xOrigin,x=s.yOrigin,E=s.xOffset,_=s.yOffset,S=s.forceCSS,M=parseFloat(f),A=parseFloat(d);h=parseFloat(h),v=parseFloat(v),(m=parseFloat(m))&&(v+=m=parseFloat(m),h+=m),h||v?(h*=p,v*=p,n=Math.cos(h)*g,r=Math.sin(h)*g,i=-(Math.sin(h-v)*b),o=Math.cos(h-v)*b,v&&(m*=p,i*=a=Math.sqrt(1+(a=Math.tan(v-m))*a),o*=a,m&&(n*=a=Math.sqrt(1+(a=Math.tan(m))*a),r*=a)),n=(0,u.E_)(n),r=(0,u.E_)(r),i=(0,u.E_)(i),o=(0,u.E_)(o)):(n=g,o=b,r=i=0),(M&&!~(f+"").indexOf("px")||A&&!~(d+"").indexOf("px"))&&(M=Z(y,"x",f,"px"),A=Z(y,"y",d,"px")),(w||x||E||_)&&(M=(0,u.E_)(M+w-(w*n+x*i)+E),A=(0,u.E_)(A+x-(w*r+x*o)+_)),(l||c)&&(a=y.getBBox(),M=(0,u.E_)(M+l/100*a.width),A=(0,u.E_)(A+c/100*a.height)),a="matrix("+n+","+r+","+i+","+o+","+M+","+A+")",y.setAttribute("transform",a),S&&(y.style[C]=a)},eg=function(e,t,n,r,i){var o,a,s=(0,u.vQ)(i),l=parseFloat(i)*(s&&~i.indexOf("rad")?d:1)-r,c=r+l+"deg";return s&&("short"===(o=i.split("_")[1])&&(l%=360)!=l%180&&(l+=l<0?360:-360),"cw"===o&&l<0?l=(l+36e9)%360-360*~~(l/360):"ccw"===o&&l>0&&(l=(l-36e9)%360-360*~~(l/360))),e._pt=a=new u.J7(e._pt,t,n,r,l,w),a.e=c,a.u="deg",e._props.push(n),a},eb=function(e,t){for(var n in t)e[n]=t[n];return e},ey=function(e,t,n){var r,i,o,a,s,l,c,d=eb({},n._gsap),p=n.style;for(i in d.svg?(o=n.getAttribute("transform"),n.setAttribute("transform",""),p[C]=t,r=eu(n,1),X(n,C),n.setAttribute("transform",o)):(o=getComputedStyle(n)[C],p[C]=t,r=eu(n,1),p[C]=o),f)(o=d[i])!==(a=r[i])&&0>"perspective,force3D,transformOrigin,svgOrigin".indexOf(i)&&(s=(0,u.l_)(o)!==(c=(0,u.l_)(a))?Z(n,i,o,c):parseFloat(o),l=parseFloat(a),e._pt=new u.J7(e._pt,r,i,s,l-s,y),e._pt.u=c||0,e._props.push(i));eb(r,d)};(0,u.fA)("padding,margin,Width,Radius",function(e,t){var n="Right",r="Bottom",i="Left",o=(t<3?["Top",n,r,i]:["Top"+i,"Top"+n,r+n,r+i]).map(function(n){return t<2?e+n:"border"+n+e});er[t>1?"border"+e:e]=function(e,t,n,r,i){var a,s;if(arguments.length<4)return 5===(s=(a=o.map(function(t){return Q(e,t,n)})).join(" ")).split(a[0]).length?a[0]:s;a=(r+"").split(" "),s={},o.forEach(function(e,t){return s[e]=a[t]=a[t]||a[(t-1)/2|0]}),e.init(t,s,i)}});var ew={name:"css",register:Y,targetTest:function(e){return e.style&&e.nodeType},init:function(e,t,n,r,i){var a,s,l,c,d,p,h,v,m,w,S,M,A,O,L,T,P,D=this._props,k=e.style,I=n.vars.startAt;for(h in o||Y(),this.styles=this.styles||z(e),T=this.styles.props,this.tween=n,t)if("autoRound"!==h&&(s=t[h],!(u.wU[h]&&(0,u.Zm)(h,t,n,r,e,i)))){if(d=typeof s,p=er[h],"function"===d&&(d=typeof(s=s.call(n,r,e,i))),"string"===d&&~s.indexOf("random(")&&(s=(0,u.Vy)(s)),p)p(this,e,h,s,n)&&(L=1);else if("--"===h.substr(0,2))a=(getComputedStyle(e).getPropertyValue(h)+"").trim(),s+="",u.qA.lastIndex=0,!u.qA.test(a)&&(v=(0,u.l_)(a),(m=(0,u.l_)(s))?v!==m&&(a=Z(e,h,a,m)+m):v&&(s+=v)),this.add(k,"setProperty",a,s,r,i,0,0,h),D.push(h),T.push(h,0,k[h]);else if("undefined"!==d){if(I&&h in I?(a="function"==typeof I[h]?I[h].call(n,r,e,i):I[h],(0,u.vQ)(a)&&~a.indexOf("random(")&&(a=(0,u.Vy)(a)),(0,u.l_)(a+"")||"auto"===a||(a+=u.Yz.units[h]||(0,u.l_)(Q(e,h))||""),"="===(a+"").charAt(1)&&(a=Q(e,h))):a=Q(e,h),c=parseFloat(a),(w="string"===d&&"="===s.charAt(1)&&s.substr(0,2))&&(s=s.substr(2)),l=parseFloat(s),h in b&&("autoAlpha"===h&&(1===c&&"hidden"===Q(e,"visibility")&&l&&(c=0),T.push("visibility",0,k.visibility),V(this,k,"visibility",c?"inherit":"hidden",l?"inherit":"hidden",!l)),"scale"!==h&&"transform"!==h&&~(h=b[h]).indexOf(",")&&(h=h.split(",")[0])),S=h in f){if(this.styles.save(h),P=s,"string"===d&&"var(--"===s.substring(0,6)){if("calc("===(s=B(e,s.substring(4,s.indexOf(")")))).substring(0,5)){var j=e.style.perspective;e.style.perspective=s,s=B(e,"perspective"),j?e.style.perspective=j:X(e,"perspective")}l=parseFloat(s)}if(M||((A=e._gsap).renderTransform&&!t.parseTransform||eu(e,t.parseTransform),O=!1!==t.smoothOrigin&&A.smooth,(M=this._pt=new u.J7(this._pt,k,C,0,1,A.renderTransform,A,0,-1)).dep=1),"scale"===h)this._pt=new u.J7(this._pt,A,"scaleY",A.scaleY,(w?(0,u.B0)(A.scaleY,w+l):l)-A.scaleY||0,y),this._pt.u=0,D.push("scaleY",h),h+="X";else if("transformOrigin"===h){T.push(R,0,k[R]),s=et(s),A.svg?ec(e,s,0,O,0,this):((m=parseFloat(s.split(" ")[2])||0)!==A.zOrigin&&V(this,A,"zOrigin",A.zOrigin,m),V(this,k,h,ef(a),ef(s)));continue}else if("svgOrigin"===h){ec(e,s,1,O,0,this);continue}else if(h in eo){eg(this,A,h,c,w?(0,u.B0)(c,w+s):s);continue}else if("smoothOrigin"===h){V(this,A,"smooth",A.smooth,s);continue}else if("force3D"===h){A[h]=s;continue}else if("transform"===h){ey(this,s,e);continue}}else h in k||(h=N(h)||h);if(S||(l||0===l)&&(c||0===c)&&!g.test(s)&&h in k)v=(a+"").substr((c+"").length),l||(l=0),m=(0,u.l_)(s)||(h in u.Yz.units?u.Yz.units[h]:v),v!==m&&(c=Z(e,h,a,m)),this._pt=new u.J7(this._pt,S?A:k,h,c,(w?(0,u.B0)(c,w+l):l)-c,!S&&("px"===m||"zIndex"===h)&&!1!==t.autoRound?_:y),this._pt.u=m||0,S&&P!==s?(this._pt.b=a,this._pt.e=P,this._pt.r=E):v!==m&&"%"!==m&&(this._pt.b=a,this._pt.r=x);else if(h in k)J.call(this,e,h,a,w?w+s:s);else if(h in e)this.add(e,h,a||e[h],w?w+s:s,r,i);else if("parseTransform"!==h){(0,u.dg)(h,s);continue}S||(h in k?T.push(h,0,k[h]):"function"==typeof e[h]?T.push(h,2,e[h]()):T.push(h,1,a||e[h])),D.push(h)}}L&&(0,u.St)(this)},render:function(e,t){if(t.tween._time||!l())for(var n=t._pt;n;)n.r(e,n.d),n=n._next;else t.styles.revert()},get:Q,aliases:b,getSetter:function(e,t,n){var r=b[t];return r&&0>r.indexOf(",")&&(t=r),t in f&&t!==R&&(e._gsap.x||Q(e,"x"))?n&&s===n?"scale"===t?T:L:(s=n||{},"scale"===t?P:D):e.style&&!(0,u.OF)(e.style[t])?A:~t.indexOf("-")?O:(0,u.Dx)(e,t)},core:{_removeProperty:X,_getMatrix:el}};u.os.utils.checkPrefix=N,u.os.core.getStyleSaver=z,function(e,t,n,r){var i=(0,u.fA)(e+","+t+","+n,function(e){f[e]=1});(0,u.fA)(t,function(e){u.Yz.units[e]="deg",eo[e]=1}),b[i[13]]=e+","+t,(0,u.fA)(r,function(e){var t=e.split(":");b[t[1]]=i[t[0]]})}("x,y,z,scale,scaleX,scaleY,xPercent,yPercent","rotation,rotationX,rotationY,skewX,skewY","transform,transformOrigin,svgOrigin,force3D,smoothOrigin,transformPerspective","0:translateX,1:translateY,2:translateZ,8:rotate,8:rotationZ,8:rotateZ,9:rotateX,10:rotateY"),(0,u.fA)("x,y,z,top,right,bottom,left,width,height,fontSize,padding,margin,perspective",function(e){u.Yz.units[e]="px"}),u.os.registerPlugin(ew);var ex=u.os.registerPlugin(ew)||u.os;ex.core.Tween},9859:(e,t,n)=>{n.d(t,{G:()=>a});var r=n(5903),i=n(2371);let o=parseInt(r.sPf.replace(/\D+/g,""));class a extends r.BKk{constructor(e){super({type:"LineMaterial",uniforms:r.LlO.clone(r.LlO.merge([i.UniformsLib.common,i.UniformsLib.fog,{worldUnits:{value:1},linewidth:{value:1},resolution:{value:new r.I9Y(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}}])),vertexShader:`
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
			`,clipping:!0}),this.isLineMaterial=!0,this.onBeforeCompile=function(){this.transparent?this.defines.USE_LINE_COLOR_ALPHA="1":delete this.defines.USE_LINE_COLOR_ALPHA},Object.defineProperties(this,{color:{enumerable:!0,get:function(){return this.uniforms.diffuse.value},set:function(e){this.uniforms.diffuse.value=e}},worldUnits:{enumerable:!0,get:function(){return"WORLD_UNITS"in this.defines},set:function(e){!0===e?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}},linewidth:{enumerable:!0,get:function(){return this.uniforms.linewidth.value},set:function(e){this.uniforms.linewidth.value=e}},dashed:{enumerable:!0,get:function(){return"USE_DASH"in this.defines},set(e){!!e!="USE_DASH"in this.defines&&(this.needsUpdate=!0),!0===e?this.defines.USE_DASH="":delete this.defines.USE_DASH}},dashScale:{enumerable:!0,get:function(){return this.uniforms.dashScale.value},set:function(e){this.uniforms.dashScale.value=e}},dashSize:{enumerable:!0,get:function(){return this.uniforms.dashSize.value},set:function(e){this.uniforms.dashSize.value=e}},dashOffset:{enumerable:!0,get:function(){return this.uniforms.dashOffset.value},set:function(e){this.uniforms.dashOffset.value=e}},gapSize:{enumerable:!0,get:function(){return this.uniforms.gapSize.value},set:function(e){this.uniforms.gapSize.value=e}},opacity:{enumerable:!0,get:function(){return this.uniforms.opacity.value},set:function(e){this.uniforms.opacity.value=e}},resolution:{enumerable:!0,get:function(){return this.uniforms.resolution.value},set:function(e){this.uniforms.resolution.value.copy(e)}},alphaToCoverage:{enumerable:!0,get:function(){return"USE_ALPHA_TO_COVERAGE"in this.defines},set:function(e){!!e!="USE_ALPHA_TO_COVERAGE"in this.defines&&(this.needsUpdate=!0),!0===e?(this.defines.USE_ALPHA_TO_COVERAGE="",this.extensions.derivatives=!0):(delete this.defines.USE_ALPHA_TO_COVERAGE,this.extensions.derivatives=!1)}}}),this.setValues(e)}}}}]);