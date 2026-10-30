/* screen: showModule01  (119.6 KB) */
DC.slot('showModule01', `<sc-if value="{{ showModule01 }}" hint-placeholder-val="{{ false }}">
    <div data-screen-label="Module 01 — PVT Sampling" class="m01" style="display:flex; flex-direction:column; height:var(--page-h); overflow:hidden;">
      

      <!-- page header: full width, same on overview + the four sampling pages -->
      <div class="m01-head" style="{{ m01HeadStyle }}">
        <div style="border-left:3px solid var(--blue); padding-left:14px; flex:1 1 auto; min-width:0;">
          <div class="pg-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="{{ m01Title }}">{{ m01Title }}</div>
          <div style="font-size:11.5px; color:var(--mut); font-weight:300; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ m01Subtitle }}</div>
        </div>
        <div class="m01-btns" style="{{ m01BtnColStyle }}">
          <sc-if value="{{ actBh }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex; gap:6px; background:var(--track); border:1px solid var(--line2); border-radius:9px; padding:4px;">
            <button onclick="{{ selOpenHole }}" style="{{ mbOpenHole }}" class="nav-btn" style-hover="border-color:var(--blue);">Open Hole · MRMS</button>
            <button onclick="{{ selCasedHole }}" style="{{ mbCasedHole }}" class="nav-btn" style-hover="border-color:var(--blue);">Cased Hole · SRS</button>
          </div>
          </sc-if>
          <div style="display:flex; justify-content:flex-end; gap:6px; flex-wrap:nowrap;">
            <button onclick="{{ selOv }}" style="{{ mbOv }}" class="nav-btn" style-hover="border-color:var(--blue);">Overview</button>
            <button onclick="{{ selBh }}" style="{{ mbBh }}" class="nav-btn" style-hover="border-color:var(--blue);">Bottom Hole</button>
            <button onclick="{{ selWh }}" style="{{ mbWh }}" class="nav-btn" style-hover="border-color:var(--blue);">Wellhead</button>
            <button onclick="{{ selSep }}" style="{{ mbSep }}" class="nav-btn" style-hover="border-color:var(--blue);">Separator</button>
          </div>
          
        </div>
      </div>

      <!-- body: schematic | side panel (336 px) on the four sampling pages; schematic only on the overview -->
      <div class="m01-grid" style="{{ m01GridStyle }}">

        <!-- LEFT: schematic board -->
        <div class="m01-board" data-rz-frame style="background:radial-gradient(120% 90% at 50% 0%,#0c1526,#070c16); border:none; border-radius:0; padding:0; display:flex; flex-direction:column; min-width:0; align-self:stretch; position:relative; overflow:hidden; background-image:linear-gradient(rgba(150,175,210,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(150,175,210,.035) 1px,transparent 1px); background-size:34px 34px;">


          <div style="position:relative; flex:1; min-height:0; min-width:0; display:flex; justify-content:center; overflow:hidden;">

          <sc-if value="{{ actBh }}" hint-placeholder-val="{{ false }}">
          <div ref="{{ bhHost }}" class="m01-bh" style="position:absolute; inset:0;"></div>
          </sc-if>

          <!-- ===== FIELD SYSTEM: ONE drawing (components/FieldSketch.js) for Overview, Wellhead and Separator.
               Sampling pages dim the inactive equipment groups (.fz-dim, theme.css) and add their sampling overlay. ===== -->
          <sc-if value="{{ fieldVis }}" hint-placeholder-val="{{ true }}">
          <svg sc-camel-view-box="{{ fieldVB }}" sc-camel-preserve-aspect-ratio="xMidYMin meet" overflow="visible" style="{{ m01SvgStyle }}">
          <defs>${FieldSketch.defs}${SampleBottle.defs('sb')}</defs>
          ${FieldSketch.system({ well:'{{ fzWellCls }}', tree:'{{ fzTreeCls }}', mid:'{{ fzMidCls }}', sep:'{{ fzSepCls }}' })}

          <!-- overview: hover notes + clickable sampling locations -->
          <sc-if value="{{ actOv }}" hint-placeholder-val="{{ true }}">
          <g>${FieldSketch.tips}${FieldSketch.markers}</g>
          </sc-if>

          <!-- ===== WELLHEAD SAMPLING: sampling valve on the flowline just after the X-tree -> tubing -> piston bottle ===== -->
          <sc-if value="{{ actWh }}" hint-placeholder-val="{{ false }}">
          <g class="fz-focus">
            <path d="M206 196 V186 Q206 174 218 174 H328 Q340 174 340 186 V189.28 Q340 201.28 352 201.28 H360.09" fill="none" stroke="#0a0e16" stroke-width="7" stroke-linejoin="round"></path>
            <path d="M206 196 V186 Q206 174 218 174 H328 Q340 174 340 186 V189.28 Q340 201.28 352 201.28 H360.09" fill="none" stroke="#63779a" stroke-width="4.6" stroke-linejoin="round"></path>
            <path d="M204.8 196 V186 Q204.8 172.8 218 172.8 H328" fill="none" stroke="#dbe6f5" stroke-width="1.1" opacity=".45"></path>
            <sc-if value="{{ sampleFlow }}" hint-placeholder-val="{{ false }}">
            <path d="M206 196 V186 Q206 174 218 174 H328 Q340 174 340 186 V189.28 Q340 201.28 352 201.28 H360.09" fill="none" stroke="#e7b15a" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="4 10" style="animation:dashflow calc(1s * var(--pm, 1)) linear infinite;"></path>
            </sc-if>
            <!-- sampling valve (needle valve on the flowline riser) -->
            <circle cx="206" cy="206" r="13" fill="none" stroke="#5fd0ff" stroke-width="1.4" opacity=".5" style="transform-box:fill-box; transform-origin:center; animation:ringpulse calc(2.4s * var(--pm, 1)) ease-out infinite;"></circle>
            <rect x="202" y="210" width="8" height="15" fill="url(#ovMetal)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <path d="M199 197 L213 197 L206 206 Z M199 215 L213 215 L206 206 Z" fill="{{ whValveFill }}" stroke="#0a0e16" stroke-width="1" stroke-linejoin="round"></path>
            <line x1="206" y1="206" x2="193" y2="206" stroke="#8fa3c2" stroke-width="1.8"></line>
            <rect x="190.5" y="199.5" width="3" height="13" rx="1.4" fill="url(#ovMetalH)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <circle cx="206" cy="206" r="1.8" fill="#0a0e16"></circle>
            <path d="M216 160 L211 196" fill="none" stroke="var(--cap2)" stroke-width=".8"></path>
            <text x="218" y="148" font-family="IBM Plex Sans, sans-serif" font-size="12" font-weight="600" fill="var(--txt)">Sampling valve</text>
            <text x="218" y="160" font-family="IBM Plex Mono, monospace" font-size="9.4" fill="var(--lbl2)">flowline · after X-tree</text>
            <!-- approved Oil Sample Bottle (components/SampleBottle.js): sample above the piston, driving fluid below.
                 Wellhead only: mirrored so the right-angle valves face LEFT (toward the wellhead); lower valve guard rests on the ground (y 360) -->
            <ellipse cx="372" cy="360" rx="16" ry="2.6" fill="rgba(0,0,0,.28)"></ellipse>
            ${SampleBottle.markup({ p:'sb', x:372, y:176.7, s:0.55, flip:true, bd:'oil', bdCtx:'Wellhead sampling bottle', sample:'{{ whBtlSample }}', buffer:'{{ whBtlBuffer }}', piston:'{{ whBtlPiston }}' })}
            <path d="M390 156 L377 186" fill="none" stroke="var(--cap2)" stroke-width=".8"></path>
            <text x="392" y="150" font-family="IBM Plex Sans, sans-serif" font-size="12" font-weight="600" fill="var(--acca2)">Oil sample bottle</text>
            <text x="392" y="162" font-family="IBM Plex Mono, monospace" font-size="9.4" fill="var(--lbl2)">floating piston · driving fluid below</text>
          </g>
          </sc-if>

          <!-- ===== SEPARATOR SAMPLING: gas outlet -> gas bottle (above) | oil outlet -> oil piston bottle (right) ===== -->
          <sc-if value="{{ actSep }}" hint-placeholder-val="{{ false }}">
          <g class="fz-focus">
            <!-- gas path -->
            <path d="M1110 144 V84 Q1110 72 1122 72 H1238 Q1250 72 1250 84 V93.88" fill="none" stroke="#0a0e16" stroke-width="7" stroke-linejoin="round"></path>
            <path d="M1110 144 V84 Q1110 72 1122 72 H1238 Q1250 72 1250 84 V93.88" fill="none" stroke="#63779a" stroke-width="4.6" stroke-linejoin="round"></path>
            <path d="M1108.8 144 V84 Q1108.8 70.8 1122 70.8 H1238" fill="none" stroke="#dbe6f5" stroke-width="1.1" opacity=".45"></path>
            <sc-if value="{{ sampleFlow }}" hint-placeholder-val="{{ false }}">
            <path d="M1110 144 V84 Q1110 72 1122 72 H1238 Q1250 72 1250 84 V93.88" fill="none" stroke="#9fe4ff" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="4 10" style="animation:dashflow calc(1s * var(--pm, 1)) linear infinite;"></path>
            </sc-if>
            <path d="M1103 141 L1117 141 L1110 150 Z M1103 159 L1117 159 L1110 150 Z" fill="{{ sepValveFill }}" stroke="#0a0e16" stroke-width="1" stroke-linejoin="round"></path>
            <line x1="1110" y1="150" x2="1123" y2="150" stroke="#8fa3c2" stroke-width="1.8"></line>
            <rect x="1122.5" y="143.5" width="3" height="13" rx="1.4" fill="url(#ovMetalH)" stroke="#0a0e16" stroke-width="0.7"></rect>
            ${SampleBottle.markup({ p:'sb', x:1250, y:60, s:0.52, mode:'gas', bd:'gas', bdCtx:'Separator gas sample bottle', sample:'{{ sepGasFill }}' })}
            <text x="1232" y="112" text-anchor="end" font-family="IBM Plex Sans, sans-serif" font-size="12" font-weight="600" fill="var(--hdb3)">Gas sample</text>
            <text x="1232" y="123" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="9.4" fill="var(--lbl2)">gas outlet line</text>
            <!-- oil path (oil bottle mirrored: its sample valve faces the incoming line) -->
            <path d="M1120 274 V232.4 Q1120 220.4 1132 220.4 H1289.6" fill="none" stroke="#0a0e16" stroke-width="7" stroke-linejoin="round"></path>
            <path d="M1120 274 V232.4 Q1120 220.4 1132 220.4 H1289.6" fill="none" stroke="#63779a" stroke-width="4.6" stroke-linejoin="round"></path>
            <path d="M1118.8 274 V232.4 Q1118.8 219.2 1132 219.2 H1266" fill="none" stroke="#dbe6f5" stroke-width="1.1" opacity=".45"></path>
            <sc-if value="{{ sampleFlow }}" hint-placeholder-val="{{ false }}">
            <path d="M1120 274 V232.4 Q1120 220.4 1132 220.4 H1289.6" fill="none" stroke="#e7b15a" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="4 10" style="animation:dashflow calc(1s * var(--pm, 1)) linear infinite;"></path>
            </sc-if>
            <path d="M1113 269 L1127 269 L1120 278 Z M1113 287 L1127 287 L1120 278 Z" fill="{{ sepValveFill }}" stroke="#0a0e16" stroke-width="1" stroke-linejoin="round"></path>
            <line x1="1120" y1="278" x2="1107" y2="278" stroke="#8fa3c2" stroke-width="1.8"></line>
            <rect x="1104.5" y="271.5" width="3" height="13" rx="1.4" fill="url(#ovMetalH)" stroke="#0a0e16" stroke-width="0.7"></rect>
            <ellipse cx="1300" cy="360" rx="15" ry="2.4" fill="rgba(0,0,0,.28)"></ellipse>
            ${SampleBottle.markup({ p:'sb', x:1300, y:199, s:0.48, flip:true, bd:'oil', bdCtx:'Separator oil sample bottle', sample:'{{ sepBtlSample }}', buffer:'{{ sepBtlBuffer }}', piston:'{{ sepBtlPiston }}' })}
            <text x="1280" y="264" text-anchor="end" font-family="IBM Plex Sans, sans-serif" font-size="12" font-weight="600" fill="var(--acca2)">Oil sample</text>
            <text x="1280" y="275" text-anchor="end" font-family="IBM Plex Mono, monospace" font-size="9.4" fill="var(--lbl2)">oil outlet line</text>
          </g>
          </sc-if>
          </svg>
          </sc-if>
          </div>

          <sc-if value="{{ showDataBar }}" hint-placeholder-val="{{ false }}">
          <!-- bottom real-time data panel -->
          <div style="flex:0 0 auto; padding:7px 20px 9px; display:flex; align-items:stretch; gap:8px; border-top:1px solid var(--line); background:var(--strip); overflow-x:auto;">
            <div style="display:flex; flex-direction:column; justify-content:center; gap:3px; padding-right:12px; border-right:1px solid var(--line2); flex:0 0 auto;">
              <span style="display:flex; align-items:center; gap:6px;"><span style="width:7px; height:7px; border-radius:50%; background:{{ rtStatusColor }};"></span><span style="font-family:'IBM Plex Mono'; font-size:8.5px; letter-spacing:1px; color:var(--mut);">LIVE</span></span>
              <span style="font-family:'IBM Plex Mono'; font-size:8.5px; letter-spacing:1px; color:var(--mut);">DATA</span>
            </div>
            <sc-for list="{{ bottomCards }}" as="card" hint-placeholder-count="5">
            <div style="flex:1 1 0; min-width:96px; background:var(--icard); border:1px solid var(--line2); border-radius:8px; padding:6px 10px; display:flex; flex-direction:column; gap:2px;">
              <span style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.5px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ card.l }}</span>
              <span style="{{ card.vstyle }}">{{ card.v }} <span style="font-size:8.5px; font-weight:400; color:var(--mut);">{{ card.u }}</span></span>
            </div>
            </sc-for>
          </div>
          </sc-if>
        </div>

        <!-- RIGHT: bottom-hole process status (BH page only) -->
        <sc-if value="{{ showBhPanel }}" hint-placeholder-val="{{ false }}">
        <div class="m01-bhpanel" style="display:flex; flex-direction:column; gap:9px; min-width:0; max-height:100%; overflow:auto; padding:12px 12px; background:var(--rail); border-left:1px solid var(--line);">

          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:22px; height:22px; border-radius:7px; background:rgba(77,157,255,.14); color:var(--blue); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none"><path d="M12 3v13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path><path d="M8 12l4 5 4-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path><path d="M4 21h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg></span>
            <span style="font-size:13px; font-weight:600; color:var(--txt); flex:1;">Sampling Process</span>
            <span style="font-family:'IBM Plex Mono'; font-size:9px; letter-spacing:.8px; color:var(--mut); background:var(--icard); border:1px solid var(--line2); border-radius:5px; padding:3px 7px; white-space:nowrap; flex:0 0 auto;">BHS-001</span>
          </div>

          <div style="background:var(--icard); border:1px solid var(--line2); border-radius:10px; padding:11px 12px; display:flex; flex-direction:column; gap:8px;">
            <div style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.9px; color:var(--mut);">CURRENT STAGE</div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="width:8px; height:8px; border-radius:50%; flex:0 0 auto; background:{{ bhStatusColor }};"></span>
              <span style="font-size:14px; font-weight:600; color:var(--txt); line-height:1.25;">{{ bhToolStatus }}</span>
            </div>
            <div style="height:4px; border-radius:3px; background:var(--track); overflow:hidden;">
              <div style="{{ bhProgStyle }}"></div>
            </div>
            <div style="font-family:'IBM Plex Mono'; font-size:8.5px; letter-spacing:.4px; color:var(--mut);">{{ bhPhaseNote }}</div>
          </div>

          <div style="display:flex; flex-direction:column; gap:1px;">
            <sc-for list="{{ bhFlow }}" as="st" hint-placeholder-count="4">
            <div style="display:flex; align-items:center; gap:9px; padding:7px 10px; border-radius:7px; background:{{ st.bg }};">
              <span style="width:16px; height:16px; border-radius:50%; flex:0 0 auto; display:flex; align-items:center; justify-content:center; font-family:'IBM Plex Mono'; font-size:8px; font-weight:600; border:1px solid {{ st.ring }}; color:{{ st.fg }}; background:{{ st.dot }};">{{ st.n }}</span>
              <span style="flex:1; font-size:11.5px; color:{{ st.fg }};">{{ st.label }}</span>
              <span style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.6px; color:{{ st.tagColor }};">{{ st.tag }}</span>
            </div>
            </sc-for>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div style="background:var(--icard); border:1px solid var(--line2); border-radius:8px; padding:7px 10px;">
              <div style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.7px; color:var(--mut);">TOOL DEPTH</div>
              <div style="font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; color:var(--accb); margin-top:2px; white-space:nowrap;">{{ bhDepthText }} <span style="font-size:9px; color:var(--mut);">ft</span></div>
            </div>
            <div style="background:var(--icard); border:1px solid var(--line2); border-radius:8px; padding:7px 10px;">
              <div style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.7px; color:var(--mut);">BOTTOM-HOLE PRESSURE</div>
              <div style="font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; color:var(--accb); margin-top:2px; white-space:nowrap;">{{ bhPText }} <span style="font-size:9px; color:var(--mut);">psia</span></div>
            </div>
            <div style="background:var(--icard); border:1px solid var(--line2); border-radius:8px; padding:7px 10px;">
              <div style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.7px; color:var(--mut);">TEMPERATURE</div>
              <div style="font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; color:var(--txt); margin-top:2px; white-space:nowrap;">{{ bhTText }} <span style="font-size:9px; color:var(--mut);">°F</span></div>
            </div>
            <div style="background:var(--icard); border:1px solid var(--line2); border-radius:8px; padding:7px 10px;">
              <div style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.7px; color:var(--mut);">SAMPLE STATUS</div>
              <div style="font-size:12px; font-weight:600; margin-top:3px; white-space:nowrap; color:{{ bhSampleColor }};">{{ bhSampleStatus }}</div>
            </div>
                                    <sc-if value="{{ bhOpenScene }}" hint-placeholder-val="{{ true }}">
            <div style="background:var(--icard); border:1px solid var(--line2); border-radius:8px; padding:7px 10px;">
              <div style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.7px; color:var(--mut);">CONTAMINATION</div>
              <div style="font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; color:{{ bhQualColor }}; margin-top:2px; white-space:nowrap;">{{ bhContText }}</div>
            </div>
            <div style="background:var(--icard); border:1px solid var(--line2); border-radius:8px; padding:7px 10px;">
              <div style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.7px; color:var(--mut);">FLUID QUALITY</div>
              <div style="font-family:'IBM Plex Mono'; font-size:11.5px; font-weight:600; color:{{ bhQualColor }}; margin-top:4px; white-space:nowrap;">{{ bhQualText }}</div>
            </div>
            </sc-if>
                      </div>


          <div style="flex:1 1 auto; min-height:6px;"></div>

          <button onclick="{{ bhBtnAction }}" style="{{ bhBtnStyle }}" class="act-btn">{{ bhBtnText }}</button>
          <button onclick="{{ sendToLab }}" style="{{ labBtnStyle }}" class="act-btn">{{ bhLabBtnText }}</button>
        </div>
        </sc-if>

        <!-- RIGHT: PVT bottle mechanism (wellhead / separator only) -->
        <sc-if value="{{ showBottlePanel }}" hint-placeholder-val="{{ false }}">
        <div class="m01-panel">

          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:22px; height:22px; border-radius:7px; background:rgba(77,157,255,.14); color:var(--blue); display:flex; align-items:center; justify-content:center; flex:0 0 auto;"><svg width="13" height="13" sc-camel-view-box="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="5" rx="1.5" stroke="currentColor" stroke-width="1.8"></rect><path d="M9 6v3.5L6 15a3 3 0 0 0 2.6 4.5h6.8A3 3 0 0 0 18 15l-3-5.5V6" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path></svg></span>
            <span style="font-size:13px; font-weight:600; color:var(--txt);">{{ panelTitle }}</span>
            <sc-if value="{{ actWh }}" hint-placeholder-val="{{ false }}"><button type="button" class="bd-btn" data-bd-open="oil" data-bd-ctx="Wellhead sampling bottle">Bottle Details</button></sc-if>
            <sc-if value="{{ actSep }}" hint-placeholder-val="{{ false }}"><button type="button" class="bd-btn" data-bd-open="oil|gas" data-bd-ctx="Separator sampling · oil sample bottle and gas sample bottle">Bottle Details</button></sc-if>
          </div>

          <sc-if value="{{ showLiveRow }}" hint-placeholder-val="{{ false }}">
          <div style="display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="width:7px; height:7px; border-radius:50%; flex:0 0 auto; background:{{ rtStatusColor }};"></span>
              <span style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:1px; color:var(--mut);">LIVE DATA</span>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:7px;">
              <sc-for list="{{ liveCards }}" as="card" hint-placeholder-count="2">
              <div style="background:var(--icard); border:1px solid var(--line2); border-radius:8px; padding:7px 10px; min-width:0;">
                <div style="font-family:'IBM Plex Mono'; font-size:8px; letter-spacing:.7px; color:var(--mut); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ card.l }}</div>
                <div style="font-family:'IBM Plex Mono'; font-size:14px; font-weight:600; color:var(--accb); margin-top:2px; white-space:nowrap;">{{ card.v }} <span style="font-size:9px; color:var(--mut);">{{ card.u }}</span></div>
              </div>
              </sc-for>
            </div>
          </div>
          </sc-if>


          <!-- WELLHEAD: the field bottle = approved Oil Sample Bottle (components/SampleBottle.js) -->
          <sc-if value="{{ actWh }}" hint-placeholder-val="{{ false }}">
          <div class="m01-card m01-fig">
            <svg sc-camel-view-box="200 62 390 372" sc-camel-preserve-aspect-ratio="xMidYMid meet" style="display:block; width:100%; height:100%;">
              <defs>${SampleBottle.defs('wp')}</defs>
              ${SampleBottle.markup({ p:'wp', x:300, y:74, s:1, flip:true, bd:'oil', bdCtx:'Wellhead sampling bottle', sample:'{{ whBtlSample }}', buffer:'{{ whBtlBuffer }}', piston:'{{ whBtlPiston }}' })}
              <g font-family="IBM Plex Sans, sans-serif">
                <line x1="309" y1="118.7" x2="372" y2="118.7" stroke="rgba(120,170,230,.5)" stroke-width="1"></line>
                <circle cx="374" cy="118.7" r="2.6" fill="var(--accb)"></circle>
                <text x="382" y="116.7" font-size="12" font-weight="600" fill="var(--lbl)">SAMPLE VALVE</text>
                <text x="382" y="130.7" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="var(--lbl2)">right-angle · wellhead fluid in</text>
                <!-- follows the piston: the piston style is in bottle units (scale 0.4513), so it is applied in a scaled frame -->
                <g transform="scale(1 0.4513)"><g style="{{ whBtlPiston }}"><g transform="scale(1 2.2158)">
                  <line x1="310" y1="153.9" x2="372" y2="153.9" stroke="rgba(174,188,207,.6)" stroke-width="1"></line>
                  <circle cx="374" cy="153.9" r="2.6" fill="#aebccf"></circle>
                  <text x="382" y="151.9" font-size="12" font-weight="600" fill="var(--hdg)">FLOATING PISTON</text>
                  <text x="382" y="165.9" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="var(--lbl2)">sample above · driving fluid below</text>
                </g></g></g>
                <line x1="309" y1="372.3" x2="372" y2="372.3" stroke="rgba(143,182,201,.6)" stroke-width="1"></line>
                <circle cx="374" cy="372.3" r="2.6" fill="#8fb6c9"></circle>
                <text x="382" y="370.3" font-size="12" font-weight="600" fill="var(--lbl)">DRIVING-FLUID VALVE</text>
                <text x="382" y="384.3" font-family="IBM Plex Mono, monospace" font-size="9.5" fill="var(--lbl2)">right-angle needle valve</text>
              </g>
            </svg>
          </div>
          </sc-if>

          <!-- SEPARATOR: approved Oil Sample Bottle + approved Gas Sample Bottle -->
          <sc-if value="{{ actSep }}" hint-placeholder-val="{{ false }}">
          <div class="m01-card m01-fig">
            <svg sc-camel-view-box="0 0 300 300" sc-camel-preserve-aspect-ratio="xMidYMid meet" style="display:block; width:100%; height:100%;">
              <defs>${SampleBottle.defs('sp')}</defs>
              ${SampleBottle.markup({ p:'sp', x:84, y:12, s:0.64, flip:true, bd:'oil', bdCtx:'Separator oil sample bottle', sample:'{{ sepBtlSample }}', buffer:'{{ sepBtlBuffer }}', piston:'{{ sepBtlPiston }}' })}
              ${SampleBottle.markup({ p:'sp', x:210, y:12, s:0.64, mode:'gas', bd:'gas', bdCtx:'Separator gas sample bottle', sample:'{{ sepGasFill }}' })}
              <g text-anchor="middle">
                <text x="84" y="272" font-family="IBM Plex Sans, sans-serif" font-size="11.5" font-weight="600" letter-spacing=".4" fill="var(--accg)">OIL SAMPLE</text>
                <text x="84" y="286" font-family="IBM Plex Mono, monospace" font-size="9" fill="var(--lbl2)">piston · driving fluid</text>
                <text x="210" y="272" font-family="IBM Plex Sans, sans-serif" font-size="11.5" font-weight="600" letter-spacing=".4" fill="var(--hda)">GAS SAMPLE</text>
                <text x="210" y="286" font-family="IBM Plex Mono, monospace" font-size="9" fill="var(--lbl2)">vapour · no piston</text>
              </g>
            </svg>
          </div>
          </sc-if>

          <div class="pc-host m01-pc" data-pc="Main:m01" data-pc-layout="side" style="margin-top:auto; flex:0 0 auto;"></div>
          <button onclick="{{ sendToLab }}" style="{{ labBtnStyle }}" class="act-btn">Move Sample to Lab<svg width="16" height="16" sc-camel-view-box="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></button>
        </div>
        </sc-if>
      </div>

    </div>
    </sc-if>`);
