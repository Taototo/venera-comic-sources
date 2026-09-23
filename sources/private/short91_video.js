/** @type {import('../_venera_.js')} */
class Private91ShortVideo extends ComicSource {
  type = "video";
  name = "91短视频（私人）";
  key = "private_91short_video";
  version = "1.0.1";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/short91_video.js";

  settings = {
    domain: {
      title: "站点地址",
      type: "input",
      default: "https://cn8.91short.com",
    },
  };

  get baseUrl() {
    let value = this.loadSetting("domain") || this.settings.domain.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/\/+$/, "");
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      Referer: `${this.baseUrl}/`,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    };
  }

  imageHeaders(imageUrl) {
    let referer = `${this.baseUrl}/`;
    try {
      referer = `${new URL(this.baseUrl).origin}/`;
    } catch (_) {}
    return {
      "User-Agent": this.headers["User-Agent"],
      Referer: referer,
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    };
  }

  decodeCoverResponse(bytes) {
    try {
      let key = Convert.encodeUtf8("f5d965df75336270");
      let iv = Convert.encodeUtf8("97b60394abc2fbe1");
      let decrypted = Convert.decryptAesCbc(bytes, key, iv);
      let view = new Uint8Array(decrypted);
      if (view.length === 0) return bytes;
      let padding = view[view.length - 1];
      if (padding > 0 && padding <= 16 && padding <= view.length) {
        view = view.slice(0, view.length - padding);
      }
      let isImage = view.length >= 3 &&
          ((view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) ||
           (view[0] === 0x89 && view[1] === 0x50 && view[2] === 0x4e) ||
           (view[0] === 0x47 && view[1] === 0x49 && view[2] === 0x46) ||
           (view.length >= 12 && view[0] === 0x52 && view[1] === 0x49 &&
            view[2] === 0x46 && view[8] === 0x57 && view[9] === 0x45 &&
            view[10] === 0x42 && view[11] === 0x50));
      return isImage ? view.buffer : bytes;
    } catch (_) {
      return bytes;
    }
  }

  absoluteUrl(value) {
    let text = String(value || "").trim();
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    if (text.startsWith("//")) return `https:${text}`;
    return `${this.baseUrl}${text.startsWith("/") ? "" : "/"}${text}`;
  }

  pageUrl(path, page) {
    let value = String(path || "/");
    let current = Number(page) || 1;
    if (current <= 1) return this.absoluteUrl(value);
    if (/[?&]page=\d+/i.test(value)) {
      return value.replace(/([?&]page=)\d+/i, `$1${current}`);
    }
    return `${this.absoluteUrl(value)}${value.includes("?") ? "&" : "?"}page=${current}`;
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  attribute(node, name) {
    return node && node.attributes ? String(node.attributes[name] || "") : "";
  }

  parsePageCount(doc) {
    let maxPage = 1;
    for (let link of doc.querySelectorAll("a[href]")) {
      let href = this.attribute(link, "href");
      let match = href.match(/[?&]page=(\d+)/i);
      if (match) maxPage = Math.max(maxPage, parseInt(match[1], 10));
    }
    return maxPage;
  }

  parseComic(item) {
    let links = item.querySelectorAll("a[href*='/short/']");
    let link = links.length > 0 ? links[0] : null;
    if (!link) return null;
    let id = this.attribute(link, "href");
    let titleNode = item.querySelector(".module-item-title") || link;
    let title =
      this.attribute(titleNode, "title") ||
      this.textOf(titleNode) ||
      this.attribute(link, "title");
    let image = item.querySelector("img");
    let cover = image
      ? this.attribute(image, "data-gif_cover") ||
        this.attribute(image, "data-cover") ||
        this.attribute(image, "data-poster") ||
        this.attribute(image, "data-lazy-src") ||
        this.attribute(image, "data-original") ||
        this.attribute(image, "data-src") ||
        this.attribute(image, "src")
      : "";
    let subtitle = this.textOf(item.querySelector(".module-item-in, .vip"));
    if (!id || !title) return null;
    return new Comic({
      id: id,
      title: title,
      subTitle: subtitle,
      cover: this.absoluteUrl(cover),
      description: subtitle,
    });
  }

  parseComics(doc) {
    let result = [];
    let seen = {};
    for (let item of doc.querySelectorAll(".module-item")) {
      let comic = this.parseComic(item);
      if (!comic || seen[comic.id]) continue;
      seen[comic.id] = true;
      result.push(comic);
    }
    return result;
  }

  async loadList(path, page) {
    let res = await Network.get(this.pageUrl(path, page), this.headers);
    if (res.status !== 200) throw `91短视频接口状态异常: ${res.status}`;
    let doc = new HtmlDocument(res.body);
    let result = {
      comics: this.parseComics(doc),
      maxPage: this.parsePageCount(doc),
    };
    doc.dispose();
    return result;
  }

  extractStreamFromDocument(doc) {
    let frame = doc.querySelector("iframe#playbox") || doc.querySelector("iframe[src]");
    let frameUrl = this.attribute(frame, "src");
    if (!frameUrl) return "";
    try {
      let parsed = new URL(frameUrl, this.baseUrl);
      let stream = parsed.searchParams.get("url") || "";
      if (stream) return decodeURIComponent(stream);
    } catch (_) {}
    let match = frameUrl.match(/(?:[?&]url=)(https?[^&]+)/i);
    return match ? decodeURIComponent(match[1]) : "";
  }

  explore = [
    {
      title: "91短视频",
      type: "multiPartPage",
      load: async () => {
        let parts = [];
        for (let section of [
          ["最新", "/"],
          ["AV电影", "/film"],
        ]) {
          try {
            let value = await this.loadList(section[1], 1);
            if (value.comics.length > 0) parts.push({ title: section[0], comics: value.comics });
          } catch (_) {}
        }
        return parts;
      },
    },
  ];

  category = {
    title: "91短视频",
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: ["最新", "AV电影", "国产高清", "美女正妹", "91大神", "国产AV", "门事件", "大象传媒", "情趣综艺"],
        itemType: "category",
        categoryParams: [
          "/",
          "/film",
          "/short/home_category_list/hd",
          "/short/label_related_list/Ug_pu_kskqY%3D",
          "/short/label_related_list/otDa4t6lDDQ%3D",
          "/short/label_related_list/1Bd0Zzp8D_E%3D",
          "/short/label_related_list/3QW8lOdBcls%3D",
          "/short/label_related_list/F16wCJ3LmWY%3D",
          "/short/label_related_list/-0S1LwkskU4%3D",
        ],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => this.loadList(param || "/", page || 1),
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      if (!value) return { comics: [], maxPage: 1 };
      let path = `/search?keyword=${encodeURIComponent(value)}`;
      return this.loadList(path, page || 1);
    },
    optionList: [],
  };

  comic = {
    onThumbnailLoad: (imageKey) => ({
      headers: this.imageHeaders(imageKey),
      onResponse: (bytes) => this.decodeCoverResponse(bytes),
    }),

    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `91短视频详情状态异常: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      let titleNode = doc.querySelector("h1, .module-title");
      let title = this.textOf(titleNode) || "91短视频";
      let coverNode = doc.querySelector("meta[property='og:image']") || doc.querySelector("img");
      let cover = this.attribute(coverNode, "content") || this.attribute(coverNode, "src");
      let frame = this.extractStreamFromDocument(doc);
      let chapters = frame ? { [frame]: "播放" } : {};
      let tag = this.textOf(doc.querySelector(".module-item-in, .tag-link"));
      doc.dispose();
      return new ComicDetails({
        title: title,
        cover: this.absoluteUrl(cover),
        description: tag || "91短视频",
        tags: { 类型: tag ? [tag] : ["短视频"] },
        chapters: chapters,
        url: url,
        maxPage: Object.keys(chapters).length,
      });
    },

    loadEp: async (comicId, epId) => {
      let stream = String(epId || "").trim();
      if (!/^https?:\/\//i.test(stream)) {
        let res = await Network.get(this.absoluteUrl(comicId), this.headers);
        if (res.status !== 200) throw `91短视频播放页状态异常: ${res.status}`;
        let doc = new HtmlDocument(res.body);
        stream = this.extractStreamFromDocument(doc);
        doc.dispose();
      }
      if (!stream) throw "91短视频当前视频没有可用地址";
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: stream,
            title: "91短视频",
            headers: this.headers,
          })}`,
        ],
      };
    },
  };
}
