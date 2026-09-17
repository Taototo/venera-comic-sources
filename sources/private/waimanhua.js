/** @type {import('../_venera_.js')} */
// Converted from the matching entry in the original hj.json.
class PrivateWaimanhua extends ComicSource {
  name = "歪歪漫画（私人）"
  key = "private_waimanhua"
  version = "1.0.0"
  minAppVersion = "1.2.0"
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/waimanhua.js"

  settings = {
    domain: {
      title: "站点域名",
      type: "input",
      default: "waimanhua.com"
    },
    imageCdn: {
      title: "图片 CDN",
      type: "input",
      default: "https://icnyy.tengxun.best/public"
    }
  }

  get baseUrl() {
    let domain = this.loadSetting("domain") || this.settings.domain.default
    domain = String(domain).replace(/^https?:\/\//, "").replace(/\/+$/, "")
    return `https://${domain}`
  }

  get imageBase() {
    return String(this.loadSetting("imageCdn") || this.settings.imageCdn.default).replace(/\/+$/, "")
  }

  get headers() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0.0.0 Safari/537.36",
      "Referer": `${this.baseUrl}/`
    }
  }

  get apiHeaders() {
    return {
      "User-Agent": this.headers["User-Agent"],
      "Referer": this.headers.Referer,
      "Accept": "application/json, text/plain, */*"
    }
  }

  absoluteUrl(value) {
    if (!value) return ""
    if (/^https?:\/\//i.test(value)) return value
    if (value.indexOf("//") === 0) return `https:${value}`
    return `${this.baseUrl}${value.indexOf("/") === 0 ? "" : "/"}${value}`
  }

  imageUrl(value) {
    if (!value) return ""
    if (/^https?:\/\//i.test(value)) return value
    return `${this.imageBase}${value.indexOf("/") === 0 ? "" : "/"}${value}`
  }

  async getJson(url) {
    let lastError = "请求失败"
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        let res = await Network.get(url, this.apiHeaders)
        if (res.status !== 200) throw `Invalid status code: ${res.status}`
        try {
          return JSON.parse(res.body)
        } catch (e) {
          throw "接口返回不是有效 JSON"
        }
      } catch (e) {
        lastError = String(e)
      }
    }
    throw lastError
  }

  parseComic(item) {
    if (!item || !item.id || !item.title) return null
    let cover = item.cover || item.image || ""
    let tags = []
    if (item.keyword) tags = String(item.keyword).split(",").map((value) => value.trim()).filter((value) => value)
    return new Comic({
      id: String(item.id),
      title: String(item.title).trim(),
      subTitle: item.auther || "",
      cover: this.imageUrl(cover),
      tags: tags,
      description: item.desc || item.last_chapter_title || ""
    })
  }

  parseResult(payload, page) {
    let result = payload && payload.result ? payload.result : payload
    let list = []
    if (result && Array.isArray(result.list)) list = result.list
    else if (payload && Array.isArray(payload.data)) list = payload.data
    let comics = []
    let seen = {}
    for (let item of list) {
      let comic = this.parseComic(item)
      if (comic && !seen[comic.id]) {
        seen[comic.id] = true
        comics.push(comic)
      }
    }
    let lastPage = result && result.lastPage === true
    return { comics: comics, maxPage: lastPage ? (Number(page) || 1) : (Number(page) || 1) + 1 }
  }

  async loadCategory(order, page) {
    let current = Number(page) || 1
    let payload = await this.getJson(`${this.baseUrl}/home/api/cate/tp/1-0-0-${order}-${current}`)
    if (payload.code === 0 && payload.result && !payload.result.list) return { comics: [], maxPage: 1 }
    return this.parseResult(payload, current)
  }

  explore = [{
    title: "歪歪漫画",
    type: "multiPageComicList",
    load: async (page) => this.loadCategory(0, page || 1)
  }]

  category = {
    title: "歪歪漫画",
    parts: [{
      name: "排行",
      type: "fixed",
      categories: ["最新上架", "人气排行", "高分佳作", "收藏榜", "最近更新"],
      itemType: "category",
      categoryParams: ["0", "1", "2", "3", "4"]
    }],
    enableRankingPage: false
  }

  categoryComics = {
    load: async (category, param, options, page) => this.loadCategory(param || "0", page || 1),
    optionList: []
  }

  search = {
    load: async (keyword, options, page) => {
      let current = Number(page) || 1
      let payload = await this.getJson(`${this.baseUrl}/home/api/searchk?keyword=${encodeURIComponent(keyword)}&type=1&pageNo=${current}`)
      if (payload.code === 0) return { comics: [], maxPage: 1 }
      return this.parseResult(payload, current)
    },
    optionList: []
  }

  async loadChapterList(id) {
    let payload = await this.getJson(`${this.baseUrl}/home/api/chapter_list/tp/${encodeURIComponent(id)}-1-1-9999`)
    let result = payload && payload.result ? payload.result : payload
    return result && Array.isArray(result.list) ? result.list : []
  }

  comic = {
    loadInfo: async (id) => {
      let comicId = String(id)
      let url = `${this.baseUrl}/home/book/index/id/${encodeURIComponent(comicId)}`
      let res = await Network.get(url, this.headers)
      if (res.status !== 200) throw `Invalid status code: ${res.status}`
      let document = new HtmlDocument(res.body)
      let titleNode = document.querySelector(".book-cartoon .name")
      let coverNode = document.querySelector(".book-cartoon .cover img")
      let authorNode = document.querySelector(".book-cartoon .info a[href^='/home/index/search/k/']")
      let categoryNode = document.querySelector(".book-cartoon .info a[href^='/home/book/cate/']")
      let descriptionNode = document.querySelector(".book-desc")
      let statusNode = document.querySelector(".book-cartoon .status")
      let tags = []
      for (let tag of document.querySelectorAll(".book-cartoon a.tag span.badge")) {
        let value = (tag.text || "").trim()
        if (value) tags.push(value)
      }
      document.dispose()

      let chapterList = await this.loadChapterList(comicId)
      let chapters = {}
      for (let chapter of chapterList) {
        if (chapter && chapter.id !== undefined && chapter.title) chapters[String(chapter.id)] = String(chapter.title)
      }
      let author = authorNode ? authorNode.text.trim() : ""
      let category = categoryNode ? categoryNode.text.trim() : ""
      let allTags = tags.slice()
      if (category && allTags.indexOf(category) < 0) allTags.push(category)
      return new ComicDetails({
        title: titleNode ? titleNode.text.trim() : comicId,
        cover: coverNode ? this.imageUrl(coverNode.attributes["src"]) : "",
        description: descriptionNode ? descriptionNode.text.trim() : "",
        tags: { "作者": author ? [author] : [], "标签": allTags, "状态": statusNode ? [statusNode.text.trim()] : [] },
        chapters: chapters,
        url: url
      })
    },

    loadEp: async (comicId, epId) => {
      let chapterList = await this.loadChapterList(String(comicId))
      let target = null
      for (let chapter of chapterList) {
        if (chapter && String(chapter.id) === String(epId)) {
          target = chapter
          break
        }
      }
      if (!target || !target.imagelist) throw "本章中未找到图片"
      let images = String(target.imagelist).split(",").map((value) => this.imageUrl(value.trim())).filter((value) => value)
      if (images.length === 0) throw "本章中未找到图片"
      return { images: images }
    },

    onImageLoad: () => ({ headers: this.headers }),
    onThumbnailLoad: () => ({ headers: this.headers }),
    link: {
      domains: ["waimanhua.com", "www.waimanhua.com"],
      linkToId: (url) => {
        let match = String(url || "").match(/\/home\/book\/(?:index\/id\/|capter\/id\/)(\d+)/i)
        return match ? match[1] : null
      }
    }
  }
}
