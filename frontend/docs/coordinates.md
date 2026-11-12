# Coordinate frame

The Spatial RAG viewer uses `viewer_world_v1`.

- Units are metres.
- The viewer is right-handed with +Y up.
- Ground-truth annotations are authored in source Z-up coordinates:
  `[x_src, y_src, z_src]`, where `z_src` is vertical.
- The loaded scene uses `SPLAT_ROTATION_X = -Math.PI / 2`.
- Ground-truth points use that same rotation:
  `[x_src, y_src, z_src] -> [x_src, z_src, -y_src]`.
- The floor is approximately `y = 0`; the floor plane is `(x, z)`.
- Registered anchors are stored directly in `viewer_world_v1` and are not
  transformed again.

The transform is derived from the configured scene rotation in
`src/ground-truth/coordinateTransform.ts`, rather than duplicating a
hard-coded axis conversion.
