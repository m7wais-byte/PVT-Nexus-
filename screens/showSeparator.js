/* screen: showSeparator */
DC.slot('showSeparator', `<sc-if value="{{ showSeparator }}" hint-placeholder-val="{{ false }}">
    <dc-import name="StageSeparator" hint-size="100%,100%" on-back="{{ backToAnalysis }}"></dc-import>
    </sc-if>`);
