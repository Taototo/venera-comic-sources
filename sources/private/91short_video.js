/** @type {import('../_venera_.js')} */
class Private91ShortVideo extends ComicSource {
  name = "91短视频（私人）";
  key = "private_91short_video";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/91short_video.js";

  settings = {
    domains: {
      title: "站点域名",
      type: "input",
      default: "https://cn8.91short.com",
    },
  };

  get baseUrl() {
    let value = this.loadSetting("domains") || this.settings.domains.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/\/+$/, "");
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      Referer: `${this.baseUrl}/`,
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
    };
  }

  absoluteUrl(value) {
    if (!value) return "";
    let text = String(value).trim();
    if (/^https?:\/\//i.test(text)) return text;
    if (text.indexOf("//") === 0) return `https:${text}`;
    return `${this.baseUrl}${text.indexOf("/") === 0 ? "" : "/"}${text}`;
  }

  attribute(node, name) {
    if (!node) return "";
    return (node.attributes && node.attributes[name]) || "";
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  cleanText(value) {
    return String(value || "")
      .replace(/&amp;/g, "&")
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/")
      .trim();
  }

  safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch (_) {
      return value;
    }
  }

  metaValue(body, name) {
    let text = String(body || "");
    let key = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    let match = text.match(
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${key}["'][^>]*content=["']([^"']*)["']`,
        "i"
      )
    );
    if (!match) {
      match = text.match(
        new RegExp(
          `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`,
          "i"
        )
      );
    }
    return match ? this.cleanText(match[1]) : "";
  }

  parseStream(value) {
    let text = this.cleanText(value);
    let matches = text.match(
      /https?:\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/gi
    );
    return matches && matches.length > 0 ? this.safeDecode(matches[0]) : "";
  }

  parseCard(link) {
    let href = this.attribute(link, "href");
    if (!href || !/(\/video\/|\/detail\/|\/play\/|\/post\/|\/watch\/)/i.test(href)) {
      return null;
    }
    let container = link.parent || link;
    let image = link.querySelector("img") || container.querySelector("img");
    let title =
      this.attribute(link, "title") ||
      this.attribute(link, "aria-label") ||
      this.textOf(link) ||
      this.attribute(image, "alt");
    let cover =
      this.attribute(image, "data-src") ||
      this.attribute(image, "data-original") ||
      this.attribute(image, "src");
    if (!title) return null;
    return new Comic({
      id: href,
      title: title,
      subTitle: "91短视频",
      cover: this.absoluteUrl(cover),
      description: title,
    });
  }

  parseComics(document) {
    let comics = [];
    let seen = {};
    for (let link of document.querySelectorAll("a[href]")) {
      let comic = this.parseCard(link);
      if (!comic || seen[comic.id]) continue;
      seen[comic.id] = true;
      comics.push(comic);
    }
    return comics;
  }

  async requestFirst(paths) {
    let lastStatus = 0;
    for (let path of paths) {
      try {
        let res = await Network.get(this.absoluteUrl(path), this.headers);
        lastStatus = res.status;
        if (res.status === 200 && String(res.body || "").length > 0) {
          return res;
        }
      } catch (_) {}
    }
    throw `91短视频入口不可用（状态 ${lastStatus || "网络错误"}）`;
  }

  explore = [];

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      if (!value) return { comics: [], maxPage: 1 };
      let encoded = encodeURIComponent(value);
      let current = Number(page) || 1;
      let suffix = current > 1 ? `&page=${current}` : "";
      let res = await this.requestFirst([
        `/search?keyword=${encoded}${suffix}`,
        `/search?q=${encoded}${suffix}`,
        `/search/${encoded}/${current > 1 ? `${current}/` : ""}`,
      ]);
      let document = new HtmlDocument(res.body);
      let result = { comics: this.parseComics(document), maxPage: 1 };
      document.dispose();
      return result;
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let body = String(res.body || "");
      let document = new HtmlDocument(body);
      let title = this.textOf(document.querySelector("h1"));
      if (!title) title = this.metaValue(body, "og:title") || "91短视频";
      let image = document.querySelector("meta[property='og:image']");
      let cover = this.attribute(image, "content") || this.metaValue(body, "og:image");
      let description = this.metaValue(body, "og:description");
      let chapters = new Map();
      for (let link of document.querySelectorAll("a[href]")) {
        let href = this.attribute(link, "href");
        if (!href || !/(\/video\/|\/detail\/|\/play\/|\/watch\/)/i.test(href)) continue;
        if (href === id) continue;
        let name = this.textOf(link) || this.attribute(link, "title");
        if (name) chapters.set(href, name);
      }
      if (chapters.size === 0) chapters.set(id, "播放");
      let result = new ComicDetails({
        title: title,
        cover: this.absoluteUrl(cover),
        description: description,
        tags: {},
        chapters: chapters,
        url: url,
      });
      document.dispose();
      return result;
    },

    loadEp: async (comicId, epId) => {
      let url = this.absoluteUrl(epId || comicId);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let videoUrl = this.parseStream(res.body);
      if (!videoUrl) throw "91短视频页面没有找到可播放的视频地址";
      let title = this.metaValue(res.body, "og:title") || "91短视频";
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: title,
            headers: this.headers,
          })}`,
        ],
      };
    },
  };
}
