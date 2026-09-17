/** @type {import('../_venera_.js')} */
// Converted from the matching entry in the original hj.json.
class PrivateMH250 extends ComicSource {
  name = "中国人能飞（私人）"
  key = "private_mh250"
  version = "1.0.0"
  minAppVersion = "1.2.0"
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/mh250.js"

  settings = {
    domain: {
      title: "域名",
      type: "input",
      default: "www.mh250.com"
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
    return String(value || "")
      .replace(/^https?:\/\/[^/]+/i, "")
      .replace(/^\/+|\/+$/g, "")
  }

  pathForPage(path, page) {
    let value = path || "/sort/1/"
    let current = Number(page) || 1
    if (current <= 1) return value
    if (/\/$/.test(value)) return value.replace(/\/\d+\/$/, `/${current}/`)
    return `${value}/${current}/`
  }

  parsePageCount(document) {
    let maxPage = 1
    for (let link of document.querySelectorAll("a[href]")) {
      let href = link.attributes["href"] || ""
      let match = href.match(/\/(?:sort|quanben\/sort)\/[^/]+\/(\d+)\//)
      if (!match) match = href.match(/\/sort\/(\d+)\//)
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10))
    }
    return maxPage
  }

  parseComics(document) {
    let comics = []
    let seen = {}
    for (let block of document.querySelectorAll("div.classification")) {
      let titleLink = block.querySelector("h2 a")
      if (!titleLink) continue
      let href = titleLink.attributes["href"] || ""
      let id = this.cleanId(href)
      let title = (titleLink.text || "").trim()
      if (!id || !title || seen[id]) continue
      let image = block.querySelector("img")
      let cover = image ? (image.attributes["data-src"] || image.attributes["src"] || "") : ""
      let latest = block.querySelector("p.describe a")
      seen[id] = true
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
    let res = await Network.get(this.absoluteUrl(this.pathForPage(path, page)), this.headers)
    if (res.status !== 200) throw `Invalid status code: ${res.status}`
    let document = new HtmlDocument(res.body)
    let result = {
      comics: this.parseComics(document),
      maxPage: this.parsePageCount(document)
    }
    document.dispose()
    return result
  }

  explore = [{
    title: "中国人能飞",
    type: "multiPageComicList",
    load: async (page) => this.loadList("/sort/1/", page || 1)
  }]

  category = {
    title: "中国人能飞",
    parts: [{
      name: "分类",
      type: "fixed",
      categories: ["全部", "韩漫", "日漫", "校园", "搞笑", "后宫", "生活", "恋爱", "霸总", "热血", "科幻", "古风", "真人", "悬疑", "穿越", "耽美", "恐怖", "修真", "百合"],
      itemType: "category",
      categoryParams: [
        "/sort/1/", "/sort/hanman/1/", "/sort/riman/1/", "/sort/xiaoyuan/1/", "/sort/gaoxiao/1/", "/sort/hougong/1/", "/sort/shenghuo/1/", "/sort/lianai/1/", "/sort/bazong/1/", "/sort/rexue/1/", "/sort/kehuan/1/", "/sort/gufeng/1/", "/sort/zhenren/1/", "/sort/xuanyi/1/", "/sort/chuanyue/1/", "/sort/danmei/1/", "/sort/kongbu/1/", "/sort/xiuzhen/1/", "/sort/baihe/1/"
      ]
    }],
    enableRankingPage: false
  }

  categoryComics = {
    load: async (category, param, options, page) => this.loadList(param || "/sort/1/", page || 1),
    optionList: []
  }

  search = {
    load: async (keyword) => {
      let url = `${this.baseUrl}/e3a?searchkey=${encodeURIComponent(keyword)}`
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
      let url = `${this.baseUrl}/${path}/`
      let res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      let document = new HtmlDocument(res.body)
      let titleNode = document.querySelector('meta[property="og:novel:book_name"]')
      let coverNode = document.querySelector('meta[property="og:image"]')
      let authorNode = document.querySelector('meta[property="og:novel:author"]')
      let categoryNode = document.querySelector('meta[property="og:novel:category"]')
      let descriptionNode = document.querySelector('meta[property="og:description"]') || document.querySelector('meta[name="description"]')
      let title = titleNode ? titleNode.attributes["content"] : ""
      let cover = coverNode ? coverNode.attributes["content"] : ""
      let author = authorNode ? authorNode.attributes["content"] : ""
      let category = categoryNode ? categoryNode.attributes["content"] : ""
      let description = descriptionNode ? descriptionNode.attributes["content"] : ""
      let updateNode = document.querySelector('meta[property="og:novel:update_time"]')
      let updateTime = updateNode ? updateNode.attributes["content"] : ""
      let chapters = {}
      let chapterLinks = document.querySelectorAll("#detail-list-select-1 li a")
      if (chapterLinks.length === 0) chapterLinks = document.querySelectorAll("ul.detail-list-select li a")
      for (let link of chapterLinks) {
        let href = link.attributes["href"] || ""
        let chapterTitle = (link.text || "").trim()
        if (href && chapterTitle) chapters[href] = chapterTitle
      }
      document.dispose()
      return new ComicDetails({
        title: title || path,
        cover: this.absoluteUrl(cover),
        description: description,
        tags: { "作者": author ? [author] : [], "分类": category ? [category] : [] },
        chapters: chapters,
        updateTime: updateTime,
        url: url
      })
    },

    loadEp: async (comicId, epId) => {
      let url = this.absoluteUrl(epId || comicId)
      let res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      let document = new HtmlDocument(res.body)
      let images = []
      let nodes = document.querySelectorAll(".comicpage .imgpic img[data-original]")
      if (nodes.length === 0) nodes = document.querySelectorAll("img[data-original]")
      for (let image of nodes) {
        let imageUrl = image.attributes["data-original"] || image.attributes["src"]
        if (imageUrl) images.push(this.absoluteUrl(imageUrl))
      }
      document.dispose()
      if (images.length === 0) throw "本章中未找到图片"
      return { images: images }
    },

    onImageLoad: () => ({ headers: this.headers }),
    onThumbnailLoad: () => ({ headers: this.headers }),
    link: {
      domains: ["mh250.com", "www.mh250.com"],
      linkToId: (url) => {
        let match = String(url || "").match(/https?:\/\/[^/]+(\/book\/[^/?#]+\/?)/i)
        return match ? match[1] : null
      }
    }
  }
}
