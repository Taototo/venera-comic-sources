/** @type {import('../_venera_.js')} */
class Comics55 extends ComicSource {
  name = "55漫画（私人）";
  key = "private_55comics";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/comics55.js";

  settings = {
    domain: {
      title: "域名",
      type: "input",
      default: "www.55comics.com",
    },
  };

  get baseUrl() {
    let domain = this.loadSetting("domain") || this.settings.domain.default;
    domain = String(domain).trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
    return `https://${domain}`;
  }

  get headers() {
    return {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0 Safari/537.36",
      Referer: `${this.baseUrl}/`,
    };
  }

  absoluteUrl(value) {
    if (!value) return "";
    value = String(value);
    if (/^https?:\/\//i.test(value)) return value;
    if (value.indexOf("//") === 0) return `https:${value}`;
    return `${this.baseUrl}${value.indexOf("/") === 0 ? "" : "/"}${value}`;
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  attribute(node, name) {
    return node && node.attributes ? node.attributes[name] || "" : "";
  }

  parsePageCount(document) {
    let maxPage = 1;
    for (let node of document.querySelectorAll("a[href]")) {
      let match = this.attribute(node, "href").match(/[?&]page=(\d+)/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
    }
    return maxPage;
  }

  parseComics(document) {
    let comics = [];
    let seen = {};
    for (let link of document.querySelectorAll("a[href^='/album/']")) {
      let image = link.querySelector("img");
      if (!image) continue;
      let id = this.attribute(link, "href");
      let title = this.attribute(image, "title") || this.textOf(link.parent);
      let cover = this.attribute(image, "data-original") || this.attribute(image, "data-src") || this.attribute(image, "src");
      if (!id || !title || !cover || id.indexOf("/album/") < 0) continue;
      if (cover.indexOf("loadimg") >= 0 || seen[id]) continue;
      seen[id] = true;
      comics.push(new Comic({ id: id, title: title, cover: this.absoluteUrl(cover) }));
    }
    return comics;
  }

  async loadList(path) {
    let res = await Network.get(this.absoluteUrl(path), this.headers);
    if (res.status !== 200) throw `Invalid status code: ${res.status}`;
    let document = new HtmlDocument(res.body);
    let result = { comics: this.parseComics(document), maxPage: this.parsePageCount(document) };
    document.dispose();
    return result;
  }

  explore = [{
    title: "55漫画",
    type: "multiPageComicList",
    load: async (page) => this.loadList(`/albums?page=${Number(page) || 1}`),
  }];

  category = {
    title: "55漫画",
    parts: [{
      name: "排序",
      type: "fixed",
      categories: ["最新", "最多点阅", "最多图片", "最高评分", "最多评论", "最多爱心"],
      itemType: "category",
      categoryParams: ["mr", "mv", "mp", "tr", "md", "tf"],
    }],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      return this.loadList(`/albums?o=${encodeURIComponent(String(param || "mr"))}&page=${Number(page) || 1}`);
    },
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let path = `/search.html?keyword=${encodeURIComponent(String(keyword || "").trim())}`;
      if (Number(page) > 1) path += `&page=${Number(page)}`;
      return this.loadList(path);
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let title = this.textOf(document.querySelector("h1.book-name"));
      let cover = "";
      for (let node of document.querySelectorAll("#album_photo_cover img, img[itemprop='image']")) {
        let value = this.attribute(node, "data-original") || this.attribute(node, "data-src") || this.attribute(node, "src");
        if (value && value.indexOf("loadimg") < 0) {
          cover = value;
          break;
        }
      }
      let descriptionNode = document.querySelector('meta[name="description"]');
      let description = this.attribute(descriptionNode, "content");
      let tags = [];
      for (let node of document.querySelectorAll("a.tag, a[name='vote_'], .web-tags-tag, .web-work-tag, .web-author-tag")) {
        let value = this.textOf(node);
        if (value && tags.indexOf(value) < 0) tags.push(value);
      }
      let reading = document.querySelector("a.reading[href], a[href^='/photo/']");
      let chapterId = this.attribute(reading, "href") || id;
      let chapters = new Map([[chapterId, "阅读"]]);
      let updateTime = this.textOf(document.querySelector(".float-right"));
      document.dispose();
      return new ComicDetails({
        title: title || "55漫画",
        cover: this.absoluteUrl(cover),
        description: description,
        tags: { "标签": tags },
        chapters: chapters,
        updateTime: updateTime,
        url: url,
      });
    },

    loadEp: async (comicId, epId) => {
      let url = this.absoluteUrl(epId || comicId);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let document = new HtmlDocument(res.body);
      let images = [];
      for (let node of document.querySelectorAll("img[data-src], img[data-original], img.owl-lazy, img.lazy_img")) {
        let image = this.attribute(node, "data-src") || this.attribute(node, "data-original") || this.attribute(node, "src");
        if (!image || image.indexOf("loadimg") >= 0 || image.indexOf("logo") >= 0) continue;
        if (image.indexOf("/chapter/") < 0 && image.indexOf("/photo/") < 0 && image.indexOf("/media/photos/") < 0) continue;
        image = this.absoluteUrl(image);
        if (images.indexOf(image) < 0) images.push(image);
      }
      document.dispose();
      if (images.length === 0) throw "本章中未找到图片";
      return { images: images };
    },

    onImageLoad: () => ({ headers: this.headers }),
    onThumbnailLoad: () => ({ headers: this.headers }),
    link: {
      domains: ["55comics.com", "www.55comics.com"],
      linkToId: (url) => {
        let match = String(url || "").match(/^(https?:\/\/[^/]+\/album\/[^?#]+)/i);
        return match ? match[1] : null;
      },
    },
  };
}
