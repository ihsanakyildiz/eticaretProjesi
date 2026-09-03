/** Uzun arka plan işinin HTTP isteklerine nefes vermesi için olay döngüsünü bırakır. */
export function yieldToEventLoop() {
  return new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}
