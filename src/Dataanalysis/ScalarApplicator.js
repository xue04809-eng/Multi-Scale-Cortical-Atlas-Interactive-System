export default class ScalarApplicator {
  static apply(viewManager, dataManager) {
    for (const view of viewManager.getVisibleViews()) {
      if (!view.schaefer?.renderGroup) continue;

      view.schaefer.renderGroup.traverse((object) => {
        if (!object.isMesh) return;

        delete object.userData.scalar;
      });
    }

    if (!dataManager.hasData()) {
      console.warn("No scalar data loaded.");
      return;
    }

    const scalarData = dataManager.getData();
    const resolution = dataManager.getResolution();
    const isPartial = scalarData.isPartial || false;

    let applied = 0;
    let grayCount = 0;

    for (const view of viewManager.getVisibleViews()) {
      if (!view.schaefer) continue;

      const renderGroup = view.schaefer.renderGroup;

      if (!renderGroup) continue;

      renderGroup.traverse((object) => {
        if (object.userData.type !== "parcel") return;

        const parcelId = object.userData?.parcelId;

        if (parcelId == null) return;

        if (object.userData.atlas !== scalarData.atlas) return;

        if (
          scalarData.atlas === "schaefer" &&
          object.userData.level !== resolution
        )
          return;

        const value = dataManager.getValue(parcelId);

        if (value === undefined) return;

        if (isPartial) {
          if (value !== null) {
            object.userData.scalar = value;
            applied++;
          } else {
            object.userData.scalar = null;
            grayCount++;
          }
        } else {
          object.userData.scalar = value;
          applied++;
        }
      });
    }
  }
}
