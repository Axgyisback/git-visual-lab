// Shared fade/slide-in animation used by commit nodes, the remote commit and the feedback box.
export const fadeSlide = {
  initial: { opacity: 0, y: 9 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -9 },
  transition: { duration: 0.25 },
};
