/**
 * Marks the page when the game runs inside another site's frame, such as its itch.io page,
 * where that site's toolbar floats over the top-right corner. The header then keeps its
 * buttons clear of that corner (see HeaderBar.module.css).
 */
export function markIfInFrame(win: Window = window): void {
  if (win.self !== win.top) {
    win.document.body.classList.add('in-frame');
  }
}
