/** @type {import('../_venera_.js')} */
class JmUu extends ComicSource {
  name = "禁漫天堂（网页）（18+）";
  key = "private_jm_uu";
  version = "1.0.1";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/jm_uu.js";

  settings = {
    domain: {
      title: "域名",
      type: "select",
      options: [
        { value: "comic18j-moco.work", text: "comic18j-moco.work（当前）" },
        { value: "jm-uu.cc", text: "jm-uu.cc" },
      ],
      default: "comic18j-moco.work",
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
    for (let item of document.querySelectorAll(".list-col")) {
      let link = item.querySelector("a[href^='/album/']");
      let image = item.querySelector("img[title], img[data-src], img");
      if (!link || !image) continue;
      let id = this.attribute(link, "href");
      let title = this.attribute(image, "title") || this.textOf(item.querySelector(".title-truncate"));
      let cover = this.attribute(image, "data-src") || this.attribute(image, "data-original") || this.attribute(image, "src");
      if (!id || !title || !cover || seen[id]) continue;
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
    title: "禁漫天堂",
    type: "multiPageComicList",
    load: async (page) => this.loadList(`/albums?page=${Number(page) || 1}`),
  }];

  category = {
    title: "禁漫天堂",
    parts: [{
      name: "分类",
      type: "fixed",
      categories: ["全部", "同人", "单本", "短篇", "其他类", "韩漫", "English Manga"],
      itemType: "category",
      categoryParams: ["/albums", "/albums/hanman", "/albums/single", "/albums/short", "/albums/another", "/albums/hanman", "/albums/meiman"],
    }],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      let path = String(param || "/albums");
      let separator = path.indexOf("?") >= 0 ? "&" : "?";
      return this.loadList(`${path}${separator}page=${Number(page) || 1}`);
    },
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let path = `/search/photos?search_query=${encodeURIComponent(String(keyword || "").trim())}`;
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
      for (let node of document.querySelectorAll("#album_photo_cover img")) {
        let value = this.attribute(node, "data-src") || this.attribute(node, "data-original") || this.attribute(node, "src");
        if (value && value.indexOf("/albums/blank") < 0) {
          cover = value;
          break;
        }
      }
      let descriptionNode = document.querySelector('meta[name="description"]');
      let description = this.attribute(descriptionNode, "content");
      let tags = [];
      for (let node of document.querySelectorAll(".web-tags-tag, .web-work-tag, .web-author-tag")) {
        let value = this.textOf(node);
        if (value && tags.indexOf(value) < 0) tags.push(value);
      }
      let reading = document.querySelector("a.reading[href], a[href^='/photo/']");
      let chapterId = this.attribute(reading, "href") || id;
      let chapters = new Map([[chapterId, "阅读"]]);
      let updateNode = document.querySelector(".float-right");
      let updateTime = this.textOf(updateNode);
      document.dispose();
      return new ComicDetails({
        title: title || "禁漫天堂",
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
      for (let node of document.querySelectorAll("img[data-src], img[data-original], img.owl-lazy")) {
        let image = this.attribute(node, "data-src") || this.attribute(node, "data-original") || this.attribute(node, "src");
        if (!image || image.indexOf("/albums/blank") >= 0 || image.indexOf("/logo/") >= 0) continue;
        if (image.indexOf("/media/photos/") < 0 && image.indexOf("/chapter/") < 0) continue;
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
      domains: ["jm-uu.cc", "comic18j-moco.work"],
      linkToId: (url) => {
        let match = String(url || "").match(/^(https?:\/\/[^/]+\/(?:album|photo)\/[^?#]+)/i);
        return match ? match[1] : null;
      },
    },
  };
}
