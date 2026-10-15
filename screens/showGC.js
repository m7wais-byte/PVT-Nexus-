/* screen: showGC  (0.2 KB) */
DC.slot('showGC', `<sc-if value="{{ showGC }}" hint-placeholder-val="{{ false }}">
    <dc-import name="StageGC" hint-size="100%,100%" on-back="{{ backToAnalysis }}"></dc-import>
    </sc-if>`);
