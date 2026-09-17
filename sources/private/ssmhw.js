/** @type {import('../_venera_.js')} */
// Converted from the matching entry in the original hj.json.
class PrivateSsmhw extends ComicSource {
  name = "直连韩漫网（私人）"
  key = "private_ssmhw"
  version = "1.0.0"
  minAppVersion = "1.2.0"
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/ssmhw.js"

  settings = {
    domain: {
      title: "域名",
      type: "input",
      default: "ssmhw.com"
    }
  }

  get baseUrl() {
    let domain = this.loadSetting("domain") || this.settings.domain.default
    domain = String(domain).replace(/^https?:\/\//, "").replace(/\/+$/, "")
    return `https://${domain}`
  }

  get headers() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": `${this.baseUrl}/`
    }
  }

  absoluteUrl(value) {
    if (!value) return ""
    if (/^https?:\/\//i.test(value)) return value
    if (value.indexOf("//") === 0) return `https:${value}`
    return `${this.baseUrl}${value.indexOf("/") === 0 ? "" : "/"}${value}`
  }

  cleanId(value) {
    let text = String(value || "").replace(/^https?:\/\/[^/]+/i, "")
    let match = text.match(/(\/novel\d+\/?)/i)
    return match ? match[1] : text
  }

  pageUrl(path, page) {
    let value = path || "/latest/"
    let current = Number(page) || 1
    if (current <= 1) return this.absoluteUrl(value)
    value = value.replace(/\/+$/, "")
    return `${this.baseUrl}${value}/index_${current}.html`
  }

  parsePageCount(document) {
    let maxPage = 1
    for (let link of document.querySelectorAll("a[href]")) {
      let href = link.attributes["href"] || ""
      let match = href.match(/index_(\d+)\.html/i)
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10))
    }
    return maxPage
  }

  parseComics(document) {
    let comics = []
    let seen = {}
    for (let item of document.querySelectorAll("div.home-truyendecu[itemscope]")) {
      let link = item.querySelector("a[itemprop=url]") || item.querySelector("a[href^='/novel']")
      let titleNode = item.querySelector("h3[itemprop=name]")
      let image = item.querySelector("img.wp-post-image") || item.querySelector("img")
      if (!link || !titleNode) continue
      let href = link.attributes["href"] || ""
      let id = this.cleanId(href)
      let title = (titleNode.text || "").replace(/\s+/g, " ").trim()
      let cover = image ? (image.attributes["src"] || image.attributes["data-src"] || "") : ""
      if (!id || !title || seen[id]) continue
      seen[id] = true
      let latest = item.querySelector(".tt-status a")
      comics.push(new Comic({
        id: id,
        title: title,
        cover: this.absoluteUrl(cover),
        description: latest ? latest.text.trim() : ""
      }))
    }
    return comics
  }

  async loadList(path, page) {
    let res = await Network.get(this.pageUrl(path, page), this.headers)
    if (res.status !== 200) throw `Invalid status code: ${res.status}`
    let document = new HtmlDocument(res.body)
    let result = { comics: this.parseComics(document), maxPage: this.parsePageCount(document) }
    document.dispose()
    return result
  }

  explore = [{
    title: "直连韩漫网",
    type: "multiPageComicList",
    load: async (page) => this.loadList("/latest/", page || 1)
  }]

  category = {
    title: "直连韩漫网",
    parts: [{
      name: "分类",
      type: "fixed",
      categories: ["最新更新", "最新入库", "热门排行", "完本漫画", "韩国漫画", "日本漫画", "3D漫画", "同人誌", "单行本", "杂志短篇", "Cosplay"],
      itemType: "category",
      categoryParams: ["/latest/", "/release/", "/popular/", "/completed/", "/hanman/", "/riman/", "/3d/", "/tongrenzhi/", "/single/", "/short/", "/cosplay/"]
    }],
    enableRankingPage: false
  }

  categoryComics = {
    load: async (category, param, options, page) => this.loadList(param || "/latest/", page || 1),
    optionList: []
  }

  search = {
    load: async (keyword) => {
      let url = `${this.baseUrl}/e/search/index.php?keyboard=${encodeURIComponent(keyword)}&show=title,writer,byr&searchget=1`
      let res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      let document = new HtmlDocument(res.body)
      let comics = this.parseComics(document)
      document.dispose()
      return { comics: comics, maxPage: 1 }
    },
    optionList: []
  }

  comic = {
    loadInfo: async (id) => {
      let path = this.cleanId(id)
      let url = this.absoluteUrl(path)
      let res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      let document = new HtmlDocument(res.body)
      let titleNode = document.querySelector('meta[property="og:novel:book_name"]')
      let coverNode = document.querySelector('meta[property="og:image"]')
      let authorNode = document.querySelector('meta[property="og:novel:author"]')
      let categoryNode = document.querySelector('meta[property="og:novel:category"]')
      let descriptionNode = document.querySelector('meta[name="description"]')
      let updateNode = document.querySelector('meta[property="og:novel:update_time"]')
      let chapters = {}
      let links = document.querySelectorAll("#list-chapter ul.list-chapter a")
      for (let link of links) {
        let href = link.attributes["href"] || ""
        let title = (link.querySelector(".chapter-text") || link).text.trim()
        if (href && title) chapters[href] = title
      }
      document.dispose()
      let author = authorNode ? authorNode.attributes["content"] : ""
      let category = categoryNode ? categoryNode.attributes["content"] : ""
      return new ComicDetails({
        title: titleNode ? titleNode.attributes["content"] : path,
        cover: coverNode ? coverNode.attributes["content"] : "",
        description: descriptionNode ? descriptionNode.attributes["content"] : "",
        tags: { "作者": author ? [author] : [], "分类": category ? [category] : [] },
        chapters: chapters,
        updateTime: updateNode ? updateNode.attributes["content"] : "",
        url: url
      })
    },

    loadEp: async (comicId, epId) => {
      let url = this.absoluteUrl(epId || comicId)
      let res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      let document = new HtmlDocument(res.body)
      let images = []
      for (let image of document.querySelectorAll("img.comic_img[data-original]")) {
        let imageUrl = image.attributes["data-original"] || image.attributes["src"]
        if (imageUrl && images.indexOf(imageUrl) < 0) images.push(imageUrl)
      }
      document.dispose()
      if (images.length === 0) throw "本章中未找到图片"
      return { images: images }
    },

    onImageLoad: () => ({ headers: this.headers }),
    onThumbnailLoad: () => ({ headers: this.headers }),
    link: {
      domains: ["ssmhw.com", "www.ssmhw.com"],
      linkToId: (url) => {
        let match = String(url || "").match(/https?:\/\/[^/]+(\/novel\d+\/?)/i)
        return match ? match[1] : null
      }
    }
  }
}
