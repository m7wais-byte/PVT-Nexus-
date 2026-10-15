/* screen: showDiffLib  (0.2 KB) */
DC.slot('showDiffLib', `<sc-if value="{{ showDiffLib }}" hint-placeholder-val="{{ false }}">
    <dc-import name="StageDiffLib" hint-size="100%,100%" on-back="{{ backToAnalysis }}"></dc-import>
    </sc-if>`);
