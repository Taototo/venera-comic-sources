/** @type {import('../_venera_.js')} */
class Private91PornaVideo extends ComicSource {
  type = "video";
  name = "91porna（私人）";
  key = "private_91porna_video";
  // The site moved playback into a generated embed_play.js response.  Bump
  // the source version so installed apps refresh the old resolver.
  version = "1.1.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/91porna_video.js";

  settings = {
    domain: {
      title: "站点地址",
      type: "input",
      default: "https://abf79e.qbxscriyf.cc",
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
      Accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",
      Referer: `${this.baseUrl}/`,
    };
  }

  absoluteUrl(value) {
    let text = String(value || "").trim();
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    if (text.startsWith("//")) return `https:${text}`;
    return `${this.baseUrl}${text.startsWith("/") ? "" : "/"}${text}`;
  }

  clean(value) {
    return String(value || "")
      .replace(/\\\//g, "/")
      .replace(/\\u0026/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&amp;/gi, "&")
      .trim();
  }

  textOf(node) {
    return node && node.text ? String(node.text).replace(/\s+/g, " ").trim() : "";
  }

  attribute(node, name) {
    return node && node.attributes ? String(node.attributes[name] || "") : "";
  }

  pageUrl(path, page) {
    let value = String(path || "/");
    let current = Number(page) || 1;
    if (current <= 1) return this.absoluteUrl(value);
    let separator = value.indexOf("?") >= 0 ? "&" : "?";
    return this.absoluteUrl(`${value}${separator}page=${current}`);
  }

  parsePageCount(doc) {
    let maxPage = 1;
    for (let link of doc.querySelectorAll("a[href]")) {
      let text = this.textOf(link);
      if (/^\d+$/.test(text)) maxPage = Math.max(maxPage, parseInt(text, 10));
    }
    return Math.min(maxPage, 5000);
  }

  parseComic(item) {
    let link = item.querySelector("a[href*='/comic/index/detail?video_key=']");
    if (!link) return null;
    let id = this.attribute(link, "href");
    let titleNode = item.querySelector(".line-clamp-2, .line-clamp-1") || link;
    let title = this.textOf(titleNode) || this.attribute(link, "title");
    if (!id || !title) return null;
    let image = item.querySelector("img[data-src], img[data-original], img");
    let cover = image
      ? this.attribute(image, "data-src") ||
        this.attribute(image, "data-original") ||
        this.attribute(image, "src")
      : "";
    let tags = [];
    for (let tag of item.querySelectorAll("a[href*='/comic/index/search?keyword=']")) {
      let text = this.textOf(tag);
      if (text && tags.indexOf(text) < 0) tags.push(text);
    }
    let duration = this.textOf(item.querySelector(".rounded-large, .text-sm"));
    return new Comic({
      id: id,
      title: title,
      subTitle: duration,
      cover: this.clean(cover),
      tags: tags,
      description: tags.join("、") || "91porna",
    });
  }

  parseComics(doc) {
    let result = [];
    let seen = {};
    for (let item of doc.querySelectorAll(".video-item")) {
      let comic = this.parseComic(item);
      if (!comic || seen[comic.id]) continue;
      seen[comic.id] = true;
      result.push(comic);
    }
    return result;
  }

  async loadList(path, page) {
    let res = await Network.get(this.pageUrl(path || "/", page || 1), this.headers);
    if (res.status !== 200) throw `91porna接口状态异常: ${res.status}`;
    let doc = new HtmlDocument(res.body);
    let result = {
      comics: this.parseComics(doc),
      maxPage: this.parsePageCount(doc),
    };
    doc.dispose();
    return result;
  }

  category = {
    title: "91porna",
    parts: [{
      name: "分类",
      type: "fixed",
      categories: ["最新", "热门排行榜", "国产原创"],
      itemType: "category",
      categoryParams: ["/", "/comic/index/video?category=now_month_hot", "/comic/index/video?category=original"],
    }],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) =>
      this.loadList(String(param || "/"), page || 1),
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      if (!value) return { comics: [], maxPage: 1 };
      return this.loadList(`/comic/index/search?keyword=${encodeURIComponent(value)}`, page || 1);
    },
    optionList: [],
  };

  extractStream(value) {
    let text = this.clean(value);
    let match = text.match(/https?:\/\/[^"'<>\\\s]+?(?:\.m3u8|\.mp4)(?:\?[^"'<>\\\s]*)?/i);
    return match ? match[0].replace(/[),;]+$/, "") : "";
  }

  async resolveGeneratedEmbed(embedUrl) {
    let embed = await Network.get(embedUrl, this.headers);
    if (embed.status !== 200) return null;
    let body = String(embed.body || "");

    // The inline loader is packed, but its only per-video value is a long
    // hexadecimal token.  Passing that token to embed_play.js is enough; the
    // endpoint returns a small HTML fragment containing the real HLS source.
    let tokens = body.match(/[a-f0-9]{100,}/gi) || [];
    if (tokens.length === 0) return this.extractStream(body);
    tokens.sort((left, right) => right.length - left.length);
    let playUrl = this.absoluteUrl(`/index/embed_play.js?u=${encodeURIComponent(tokens[0])}`);
    let playHeaders = this.headers;
    playHeaders.Referer = embedUrl;
    playHeaders.Accept = "application/javascript,text/javascript,*/*;q=0.8";
    let play = await Network.get(playUrl, playHeaders);
    if (play.status !== 200) return null;
    return this.extractStream(play.body);
  }

  videoKey(id) {
    let match = String(id || "").match(/[?&]video_key=([^&#]+)/i);
    return match ? decodeURIComponent(match[1]) : String(id || "").replace(/\D/g, "");
  }

  async resolveStream(id, initialUrl) {
    let key = this.videoKey(id);
    let embedUrl = initialUrl && /\/embed\b/i.test(initialUrl)
      ? initialUrl
      : this.absoluteUrl(`/comic/index/embed?id=${encodeURIComponent(key)}`);
    try {
      let stream = await this.resolveGeneratedEmbed(embedUrl);
      if (stream) return { url: stream, referer: embedUrl };
    } catch (_) {}

    // Keep a few legacy fallbacks for older mirrors that still expose the
    // address through a JSON endpoint or directly in the HTML.
    let urls = [
      initialUrl,
      this.absoluteUrl(`/api.php/api/video/detail?video_id=${encodeURIComponent(key)}`),
      this.absoluteUrl(`/api.php/api/video/play?video_id=${encodeURIComponent(key)}`),
      this.absoluteUrl(`/api.php/api/video/url?video_id=${encodeURIComponent(key)}`),
      this.absoluteUrl(`/comic/index/video?video_key=${encodeURIComponent(key)}`),
    ];
    let seen = {};
    for (let url of urls) {
      if (!url || seen[url]) continue;
      seen[url] = true;
      try {
        let res = await Network.get(url, this.headers);
        if (res.status !== 200) continue;
        let stream = this.extractStream(res.body);
        if (stream) return { url: stream, referer: url };
      } catch (_) {}
    }
    return null;
  }

  comic = {
    onThumbnailLoad: () => ({ headers: this.headers }),

    loadInfo: async (id) => {
      let url = this.absoluteUrl(id);
      let res = await Network.get(url, this.headers);
      if (res.status !== 200) throw `91porna详情状态异常: ${res.status}`;
      let doc = new HtmlDocument(res.body);
      let title = this.textOf(doc.querySelector("h1, .dx-title")) || "91porna";
      let image = doc.querySelector("meta[property='og:image']") ||
        doc.querySelector("meta[itemprop='contentUrl']") || doc.querySelector("img");
      let cover = this.attribute(image, "content") ||
        this.attribute(image, "data-src") || this.attribute(image, "src");
      let description = this.attribute(doc.querySelector("meta[name='description']"), "content") ||
        this.textOf(doc.querySelector(".video-desc"));
      let tags = [];
      for (let tag of doc.querySelectorAll("meta[property='video:tag']")) {
        let text = this.attribute(tag, "content");
        if (text && tags.indexOf(text) < 0) tags.push(text);
      }
      let key = this.videoKey(id);
      let embed = this.attribute(doc.querySelector("meta[property='og:video']"), "content") ||
        this.absoluteUrl(`/comic/index/embed?id=${encodeURIComponent(key)}`);
      doc.dispose();
      return new ComicDetails({
        title: title,
        cover: this.clean(cover),
        description: description || "91porna",
        tags: { 类型: tags },
        // 站点通过前端脚本动态取流；保留一个选集，让播放器触发真实接口探测。
        chapters: embed ? { embed: "播放" } : {},
        url: url,
        maxPage: embed ? 1 : 0,
      });
    },

    loadEp: async (comicId, epId) => {
      let resolved = await this.resolveStream(comicId, epId);
      if (!resolved)
        throw "91porna 当前页面未返回可用的 m3u8/mp4 地址，站点动态播放接口可能需要更新";
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: resolved.url,
            title: "91porna",
            headers: {
              "User-Agent": this.headers["User-Agent"],
              Referer: resolved.referer || this.baseUrl,
            },
          })}`,
        ],
      };
    },
  };
}
