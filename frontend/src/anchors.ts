export type Anchor = {
  id: string
  name: string
  position: [number, number, number]
  target: [number, number, number]
}

// Replace these starter views with values copied from the viewer console.
export const anchors: Anchor[] = [
  {
    id: 'room-reset',
    name: 'Reset to room',
    position: [0, 1.6, 9.5],
    target: [0, 1.4, 10.5],
  },
  {
      id: 'living-room',
    name: 'Living room',
  
    position: [0, 1.5, 3],
    target: [0, 1, 0],
  },
  {
     id: 'window',
    name: 'Window',
   
    position: [2, 1.5, 2],
    target: [0, 1, 0],
  },
  {
      id: 'entry',
    name: 'Entry',
    position: [-2, 1.5, 2],
    target: [0, 1, 0],
  },
  {
  id: 'tv-001',
  name: 'Television',
  position: [-1.7144, 1.2798, -0.4907],
  target: [-1.7144, 1.2798, -1.6907],
},
]
