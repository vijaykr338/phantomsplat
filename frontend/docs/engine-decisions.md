# Engine decisions

## M0 — Ground-truth frame and scene selection

- The active scene is `public/assets/3dgs_compressed.ply`.
- `labels.json`, `structure.json`, `occupancy.json`, and `occupancy.png` are
  already colocated in `public/assets/`.
- The annotation catalogue is kept separate from the older segmented Gaussian
  index under `public/data/`; the two sources use different object schemas and
  are not mixed.
- Ground-truth coordinates are converted using the active
  `SPLAT_ROTATION_X` value. With the current `-Math.PI / 2` transform this is
  `[x, y, z] -> [x, z, -y]`.
- The malformed `ins_id: ""`, `label: "room"` record is skipped because room
  geometry is supplied by `structure.json`. Other malformed records remain
  visible as loader warnings.
- The initial camera and reset view are inside the scanned room at approximately
  viewer-space `(0, 1.6, 9.5)`, looking toward `(0, 1.4, 10.5)`.
