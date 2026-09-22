/** @type {import('../_venera_.js')} */
// Converted from the matching community source configuration.
class PrivateMyhl extends ComicSource {
  name = "魅影画廊（私人）"
  key = "private_myhl"
  version = "1.0.1"
  minAppVersion = "1.2.0"
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/myhl.js"

  settings = {
    domain: {
      title: "域名",
      type: "input",
      default: "tk.myhl03.sbs"
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

  pageUrl(path, page) {
    let current = Number(page) || 1
    let value = path || "/"
    if (current <= 1) return this.absoluteUrl(value)
    if (value === "/" || value === "") return `${this.baseUrl}/page/${current}/`
    return `${this.baseUrl}${value.replace(/\/+$/, "")}/page/${current}/`
  }

  parsePageCount(document) {
    let maxPage = 1
    for (let link of document.querySelectorAll("a[href]")) {
      let href = link.attributes["href"] || ""
      let match = href.match(/\/page\/(\d+)\//)
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10))
    }
    return maxPage
  }

  parseComics(document) {
    let comics = []
    let seen = {}
    for (let item of document.querySelectorAll("div.post")) {
      let link = item.querySelector(".con h3 a") || item.querySelector(".img a")
      if (!link) continue
      let href = link.attributes["href"] || ""
      let title = (link.text || "").replace(/\s+/g, " ").trim()
      let image = item.querySelector(".img img")
      let cover = image ? (image.attributes["src"] || image.attributes["data-src"] || "") : ""
      if (!href || !title || !cover || seen[href]) continue
      seen[href] = true
      let count = item.querySelector(".num")
      comics.push(new Comic({
        id: href,
        title: title,
        cover: this.absoluteUrl(cover),
        description: count ? count.text.trim() : ""
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
    title: "魅影画廊",
    type: "multiPageComicList",
    load: async (page) => this.loadList("/", page || 1)
  }]

  category = {
    title: "魅影画廊",
    parts: [{
      name: "分类",
      type: "fixed",
      categories: ["最新更新", "大尺度", "国模套图", "韩模套图", "秀人网", "私购流出", "中国工作室", "韩国工作室", "台湾工作室", "JVID"],
      itemType: "category",
      categoryParams: [
        "/", "/category/dachidu/", "/category/rentitaotu/guomo/", "/category/rentitaotu/hanmo/", "/category/xiurenwangqixia/", "/category/xiurenwangqixia/sigou/", "/category/gongzuoshi/zggongzuoshi/", "/category/gongzuoshi/%e9%9f%a9%e5%9b%bd%e5%b7%a5%e4%bd%9c%e5%ae%A4/", "/category/gongzuoshi/taiwan/", "/author/jvid/"
      ]
    }],
    enableRankingPage: false
  }

  categoryComics = {
    load: async (category, param, options, page) => this.loadList(param || "/", page || 1),
    optionList: []
  }

  search = {
    load: async (keyword, options, page) => {
      let url = `${this.baseUrl}/?s=${encodeURIComponent(keyword)}&post_type=post`
      if (Number(page) > 1) url += `&paged=${Number(page)}`
      let res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      let document = new HtmlDocument(res.body)
      let comics = this.parseComics(document)
      let maxPage = this.parsePageCount(document)
      document.dispose()
      return { comics: comics, maxPage: maxPage }
    },
    optionList: []
  }

  comic = {
    loadInfo: async (id) => {
      let url = this.absoluteUrl(id)
      let res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      let document = new HtmlDocument(res.body)
      let titleNode = document.querySelector("h1.article-title")
      let authorNode = document.querySelector(".article-meta a[href*='/author/']")
      let descriptionNode = document.querySelector('meta[name="description"]')
      let tags = []
      for (let tag of document.querySelectorAll(".article-tags-top a")) {
        let value = (tag.text || "").trim()
        if (value) tags.push(value)
      }
      let images = document.querySelectorAll(".article-content .gallery-item a[href]")
      let imageUrls = []
      for (let image of images) {
        let imageUrl = this.absoluteUrl(image.attributes["href"] || "")
        if (imageUrl && imageUrls.indexOf(imageUrl) < 0) imageUrls.push(imageUrl)
      }
      let chapters = {}
      chapters[url] = "查看全文"
      let updateTime = ""
      let metaItems = document.querySelectorAll(".article-meta .item")
      if (metaItems.length > 1) updateTime = (metaItems[1].text || "").trim()
      let details = new ComicDetails({
        title: titleNode ? titleNode.text.trim() : "魅影画廊",
        cover: imageUrls.length > 0 ? imageUrls[0] : "",
        description: descriptionNode ? descriptionNode.attributes["content"] : "",
        tags: { "作者": authorNode ? [authorNode.text.trim()] : [], "标签": tags },
        chapters: chapters,
        updateTime: updateTime,
        url: url
      })
      document.dispose()
      return details
    },

    loadEp: async (comicId, epId) => {
      let url = this.absoluteUrl(epId || comicId)
      let res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      let document = new HtmlDocument(res.body)
      let images = []
      for (let image of document.querySelectorAll(".article-content .gallery-item a[href]")) {
        let imageUrl = this.absoluteUrl(image.attributes["href"] || "")
        if (imageUrl && images.indexOf(imageUrl) < 0) images.push(imageUrl)
      }
      document.dispose()
      if (images.length === 0) throw "本章中未找到图片"
      return { images: images }
    },

    onImageLoad: () => ({ headers: this.headers }),
    onThumbnailLoad: () => ({ headers: this.headers }),
    link: {
      domains: ["myhl03.sbs", "tk.myhl03.sbs"],
      linkToId: (url) => {
        let match = String(url || "").match(/https?:\/\/[^/]+(\/\d{4}\/\d{2}\/[^?#]+)/i)
        return match ? `https://${match[0].split("/")[2]}${match[1]}` : null
      }
    }
  }
}
