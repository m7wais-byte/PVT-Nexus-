/* screen: showDensity  (0.3 KB) */
DC.slot('showDensity', `<sc-if value="{{ showDensity }}" hint-placeholder-val="{{ false }}">
    <dc-import name="StageDensity" hint-size="100%,100%" on-back="{{ goPvTest }}" on-validation="{{ backToQC }}" on-verified="{{ dsMarkVerified }}" src-context="{{ valSrcContext }}"></dc-import>
    </sc-if>`);
