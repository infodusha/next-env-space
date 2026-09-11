/** Never reaches the screen: the layout above it fails on its space. */
export default function BrokenPage() {
  return (
    <main>
      <h1 data-testid="broken-page">broken</h1>
    </main>
  );
}
