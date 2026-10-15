/* screen: showPvTest  (0.3 KB) */
DC.slot('showPvTest', `<sc-if value="{{ showPvTest }}" hint-placeholder-val="{{ false }}">
    <dc-import name="StagePVTest" hint-size="100%,100%" on-back="{{ pvBackToFlash }}" on-validation="{{ backToQC }}" on-next="{{ goDensity }}" src-context="{{ valSrcContext }}"></dc-import>
    </sc-if>`);
