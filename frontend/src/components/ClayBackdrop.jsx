import React from 'react';

/**
 * Ambient lighting for the clay surface: slow-drifting colour blobs that show
 * through the translucent cards. Rendered once at the app root — it is fixed
 * positioned, so every route sits on top of it.
 */
function ClayBackdrop() {
  return (
    <div className="clay-backdrop" aria-hidden="true">
      <span className="clay-blob clay-blob--azure" />
      <span className="clay-blob clay-blob--pink" />
      <span className="clay-blob clay-blob--violet" />
    </div>
  );
}

export default ClayBackdrop;
