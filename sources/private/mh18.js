/** @type {import('./_venera_.js')} */
// Adapted from the hj.json 18真人图集 entry for Venera.
class PrivateMH18 extends ComicSource {
  name = "18真人图集（私人）"

  // Keep this source independent from the Ven source list.
  // 保留历史 key，已安装的私人源可直接更新。
  key = "hj_mh18"

  version = "1.1.1"

  minAppVersion = "1.4.0"

  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/mh18.js"

  settings = {
    domains: {
      title: "域名",
      type: "input",
      default: "18gallery.com"
    }
  }

  get domain() {
    let value = this.loadSetting("domains") || this.settings.domains.default
    return value.replace(/^https?:\/\//, "").replace(/\/+$/, "")
  }

  get baseUrl() {
    return `https://${this.domain}`
  }

  get headers() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": `${this.baseUrl}/`
    }
  }

  absoluteUrl(url) {
    if (!url) return ""
    if (url.indexOf("https://") === 0 || url.indexOf("http://") === 0) return url
    if (url.indexOf("//") === 0) return `https:${url}`
    return `${this.baseUrl}${url.indexOf("/") === 0 ? "" : "/"}${url}`
  }

  pageUrl(path, page) {
    page = Number(page) || 1
    if (path === "/popular/" || path === "/latest/") {
      return `${this.baseUrl}${path}?page=${page}`
    }
    return `${this.baseUrl}${path}page/${page}/`
  }

  parsePageCount(document) {
    let maxPage = 1
    for (let link of document.querySelectorAll("a[href]")) {
      let href = link.attributes["href"] || ""
      let match = href.match(/[?&]page=(\d+)/)
      if (!match) match = href.match(/\/page\/(\d+)(?:\/|$)/)
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10))
    }
    return maxPage
  }

  parseComics(document) {
    const comics = []
    const seen = []
    for (let item of document.querySelectorAll("article")) {
      let link = null
      for (let candidate of item.querySelectorAll("a[href]")) {
        const candidateHref = candidate.attributes["href"] || ""
        if (candidateHref.indexOf("/gallery/") >= 0) {
          link = candidate
          break
        }
      }
      if (!link) continue

      const href = link.attributes["href"] || ""

      const id = href
      if (!id || seen.indexOf(id) >= 0) continue

      const image = item.querySelector("img")
      const titleNode = item.querySelector("h2")
      const title = ((titleNode ? titleNode.text : (image ? image.attributes["alt"] : "")) || "").trim()
      const cover = image ? this.absoluteUrl(image.attributes["src"] || image.attributes["data-src"]) : ""
      if (!title || !cover) continue

      seen.push(id)
      comics.push(new Comic({
        id: id,
        title: title,
        cover: cover
      }))
    }
    return comics
  }

  async loadList(path, page) {
    const res = await Network.get(this.pageUrl(path, page), this.headers)
    if (res.status !== 200) {
      throw `Invalid status code: ${res.status}`
    }
    const document = new HtmlDocument(res.body)
    const result = {
      comics: this.parseComics(document),
      maxPage: this.parsePageCount(document)
    }
    document.dispose()
    return result
  }

  explore = [
    {
      title: "18GAL 最新",
      type: "multiPageComicList",
      load: async (page) => this.loadList("/latest/", page || 1)
    }
  ]

  category = {
    title: "18GAL",
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: ["最新", "热门", "Cosplay", "日本", "韩国"],
        itemType: "category",
        categoryParams: [
          "/latest/",
          "/popular/",
          "/cat/cosplay/",
          "/cat/japan/",
          "/cat/korean/"
        ]
      }
    ],
    enableRankingPage: false
  }

  categoryComics = {
    load: async (category, param, options, page) => this.loadList(param, page || 1),
    optionList: []
  }

  comic = {
    link: {
      domains: ["18gallery.com", "www.18gallery.com"],
      linkToId: (url) => {
        const match = url.match(/https?:\/\/(?:www\.)?18gallery\.com(\/gallery\/[^?#]+)/i)
        if (!match) return null
        return match[1].replace(/\/page\/\d+\/?$/, "/")
      }
    },

    onImageLoad: (url, comicId, epId) => ({ headers: this.headers }),

    onThumbnailLoad: (url) => ({ headers: this.headers }),

    loadInfo: async (id) => {
      const res = await Network.get(this.absoluteUrl(id), this.headers)
      if (res.status !== 200) {
        throw `Invalid status code: ${res.status}`
      }

      const document = new HtmlDocument(res.body)
      const titleNode = document.querySelector("h1.article-title")
      const title = titleNode ? titleNode.text.trim() : "18GAL"
      const article = document.querySelector("#article") || document.querySelector("article.article-body")
      const imageNodes = article ? article.querySelectorAll("img") : []
      const cover = imageNodes.length > 0
        ? this.absoluteUrl(imageNodes[0].attributes["src"] || imageNodes[0].attributes["data-src"])
        : ""
      const descriptionNode = document.querySelector("meta[name=description]")
      const description = descriptionNode ? descriptionNode.attributes["content"] : ""
      const canonicalNode = document.querySelector("link[rel=canonical]")
      const canonical = canonicalNode ? canonicalNode.attributes["href"] : this.absoluteUrl(id)
      const base = canonical.replace(/\/page\/\d+\/?$/, "").replace(/\/+$/, "")
      const maxPage = this.parsePageCount(document)
      const chapters = {}
      for (let page = 1; page <= maxPage; page++) {
        chapters[`${base}/page/${page}/`] = `第${page}页`
      }

      const updateNodes = document.querySelectorAll("ul.post-meta > li")
      const updateTime = updateNodes.length > 0 ? updateNodes[0].text.trim() : ""
      const parsedRecommendations = this.parseComics(document)
      const recommend = []
      for (let comic of parsedRecommendations) {
        if (this.absoluteUrl(comic.id) !== this.absoluteUrl(id)) recommend.push(comic)
      }
      document.dispose()

      return new ComicDetails({
        title: title,
        cover: cover,
        description: description,
        tags: { "站点": ["18GAL"] },
        chapters: chapters,
        recommend: recommend,
        updateTime: updateTime
      })
    },

    loadEp: async (comicId, epId) => {
      const url = epId && epId.indexOf("http") === 0 ? epId : this.absoluteUrl(epId || comicId)
      const res = await Network.get(url, this.headers)
      if (res.status !== 200) {
        throw `Invalid status code: ${res.status}`
      }

      const document = new HtmlDocument(res.body)
      const article = document.querySelector("#article") || document.querySelector("article.article-body")
      const images = []
      if (article) {
        for (let image of article.querySelectorAll("img")) {
          const imageUrl = this.absoluteUrl(image.attributes["src"] || image.attributes["data-src"])
          if (!imageUrl.match(/\/g-mhcom_\d+\.(?:webp|jpe?g|png)(?:[?#].*)?$/i)) continue
          if (images.indexOf(imageUrl) < 0) images.push(imageUrl)
        }
      }
      document.dispose()
      if (images.length === 0) throw "No gallery images found"
      return { images: images }
    }
  }
}
