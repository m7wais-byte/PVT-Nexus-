/* screen: showVisc  (viscosity stage) */
DC.slot('showVisc', `<sc-if value="{{ showVisc }}" hint-placeholder-val="{{ false }}">
    <dc-import name="StageVisc" hint-size="100%,100%" on-back="{{ backToAnalysis }}"></dc-import>
    </sc-if>`);
