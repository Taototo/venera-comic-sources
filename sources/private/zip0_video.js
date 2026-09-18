/** @type {import('../_venera_.js')} */
class PrivateZip0Video extends ComicSource {
  type = "video";
  name = "ZIP0影视（私人）";
  key = "private_zip0_video";
  version = "1.0.1";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/zip0_video.js";

  settings = {
    domains: {
      title: "站点域名",
      type: "input",
      default: "https://zip0.com",
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

  parseWatchRef(value) {
    let text = String(value || "").trim();
    let source = text.match(/[?&]source=([^&#]+)/i);
    let id = text.match(/[?&]id=([^&#]+)/i);
    if (source && id) {
      return {
        source: this.safeDecode(source[1]),
        id: this.safeDecode(id[1]),
      };
    }
    return null;
  }

  watchUrl(reference, episode) {
    let ep = parseInt(String(episode || "1"), 10) || 1;
    return `${this.baseUrl}/watch?source=${encodeURIComponent(
      reference.source
    )}&id=${encodeURIComponent(reference.id)}&episode=${ep}`;
  }

  parseEpisodeCount(body) {
    let text = String(body || "");
    let count = 0;
    let matches = text.match(/(\d+)\s*(?:<!--\s*-->\s*)?集/gi) || [];
    for (let value of matches) {
      let match = value.match(/\d+/);
      if (match) count = Math.max(count, parseInt(match[0], 10));
    }
    let buttons = text.match(/episode-picker__list[\s\S]{0,4000}/i);
    if (buttons) {
      let values = buttons[0].match(/<button[^>]*>\s*(\d+)\s*<\/button>/gi) || [];
      count = Math.max(count, values.length);
    }
    return count > 0 ? count : 1;
  }

  parseStream(body) {
    let text = this.cleanText(body);
    let matches = text.match(
      /https?:\/\/[^"'<>\\\s]+?\.(?:m3u8|mp4)(?:\?[^"'<>\\\s]*)?/gi
    );
    if (!matches || matches.length === 0) return "";
    return this.safeDecode(matches[0]);
  }

  async request(url) {
    return Network.get(url, this.headers);
  }

  async loadInfoByUrl(url) {
    let res = await this.request(url);
    if (res.status !== 200) throw `Invalid status code: ${res.status}`;
    let body = String(res.body || "");
    let title = this.metaValue(body, "og:title") || this.metaValue(body, "twitter:title");
    title = title.replace(/\s*在线播放.*$/i, "").trim() || "ZIP0影视";
    let cover = this.metaValue(body, "og:image") || this.absoluteUrl("/og.png");
    let description = this.metaValue(body, "og:description");
    let count = this.parseEpisodeCount(body);
    let chapters = new Map();
    for (let i = 1; i <= count; i++) chapters.set(String(i), `第${i}集`);
    return new ComicDetails({
      title: title,
      cover: cover,
      description: description,
      tags: {},
      chapters: chapters,
      url: url,
      maxPage: count,
    });
  }

  explore = [];

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      if (!value) return { comics: [], maxPage: 1 };
      let current = Number(page) || 1;
      let url = `${this.baseUrl}/api/videos/search?query=${encodeURIComponent(
        value
      )}&page=${current}&limit=20`;
      let res = await this.request(url);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let json;
      try {
        json = JSON.parse(res.body);
      } catch (_) {
        throw "ZIP0 返回了无法解析的搜索结果";
      }
      let list = Array.isArray(json.data) ? json.data : [];
      let comics = [];
      for (let item of list) {
        if (!item || !item.url || !item.title) continue;
        let subtitle = [item.year, item.category, item.remarks]
          .filter((v) => v && String(v).trim())
          .join(" · ");
        comics.push(
          new Comic({
            id: item.url,
            title: String(item.title),
            subTitle: subtitle,
            cover: this.absoluteUrl("/og.png"),
            description: subtitle,
          })
        );
      }
      let pages = json.pagination && parseInt(json.pagination.pages, 10);
      return { comics: comics, maxPage: pages > 0 ? pages : 1 };
    },
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      let reference = this.parseWatchRef(id);
      if (!reference) throw "ZIP0 漫画源缺少有效的播放引用";
      return this.loadInfoByUrl(this.watchUrl(reference, 1));
    },

    loadEp: async (comicId, epId) => {
      let reference = this.parseWatchRef(comicId);
      if (!reference) throw "ZIP0 漫画源缺少有效的播放引用";
      let episode = parseInt(String(epId || "1"), 10) || 1;
      let url = this.watchUrl(reference, episode);
      let res = await this.request(url);
      if (res.status !== 200) throw `Invalid status code: ${res.status}`;
      let body = String(res.body || "");
      let videoUrl = this.parseStream(body);
      if (!videoUrl) throw "ZIP0 当前集数没有可用的视频地址";
      let title = this.metaValue(body, "og:title").replace(/\s*在线播放.*$/i, "").trim();
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: videoUrl,
            title: `${title || "ZIP0影视"} 第${episode}集`,
            headers: this.headers,
          })}`,
        ],
      };
    },
  };
}
