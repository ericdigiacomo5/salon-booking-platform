export function removeTokenFromAddressBar() {
    const url = new URL(window.location.href)
    if (!url.searchParams.has("token")) return
    url.searchParams.delete("token")
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash)
}
