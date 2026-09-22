/** @type {import('../_venera_.js')} */
class PrivateVfvyqtmjVideo extends ComicSource {
  type = "video";
  name = "51吃瓜（私人）";
  key = "private_vfvyqtmj_video";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/vfvyqtmj_video.js";

  settings = {
    domain: {
      title: "站点地址",
      type: "input",
      default: "https://www.vfvyqtmj.cc",
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
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
      Referer: `${this.baseUrl}/`,
    };
  }

  attribute(node, name) {
    return node && node.attributes ? String(node.attributes[name] || "") : "";
  }

  absoluteUrl(value) {
    let text = String(value || "").trim();
    if (!text) return "";
    if (/^https?:\/\//i.test(text)) return text;
    if (text.startsWith("//")) return `https:${text}`;
    return `${this.baseUrl}${text.startsWith("/") ? "" : "/"}${text}`;
  }

  async loadLanding() {
    let res = await Network.get(this.absoluteUrl("/"), this.headers);
    if (res.status !== 200) throw `51吃瓜入口状态异常: ${res.status}`;
    let doc = new HtmlDocument(res.body);
    let titleNode = doc.querySelector("title");
    let image = doc.querySelector("meta[property='og:image']");
    let title = titleNode && titleNode.text ? titleNode.text.trim() : "51吃瓜官方入口";
    let cover = image ? this.attribute(image, "content") : "";
    doc.dispose();
    return { title: title, cover: this.absoluteUrl(cover) };
  }

  explore = [{
    title: "51吃瓜",
    type: "multiPartPage",
    load: async () => {
      let item = await this.loadLanding();
      return [{
        title: "站点入口",
        comics: [new Comic({
          id: "/",
          title: item.title,
          subTitle: "当前地址为入口/跳转页",
          cover: item.cover,
          description: "页面未提供可供 Venera 直接播放的视频列表。",
        })],
      }];
    },
  }];

  category = {
    title: "51吃瓜",
    parts: [],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async () => {
      let item = await this.loadLanding();
      return { comics: [new Comic({ id: "/", title: item.title, cover: item.cover, description: "入口页" })], maxPage: 1 };
    },
    optionList: [],
  };

  search = {
    load: async () => ({ comics: [], maxPage: 1 }),
    optionList: [],
  };

  comic = {
    onThumbnailLoad: () => ({ headers: this.headers }),
    loadInfo: async () => {
      let item = await this.loadLanding();
      return new ComicDetails({
        title: item.title,
        cover: item.cover,
        description: "该地址是 51 吃瓜官方入口/跳转页，当前未发现公开视频列表或直接播放地址。",
        tags: { 类型: ["入口页"] },
        chapters: {},
        url: this.baseUrl,
        maxPage: 0,
      });
    },
    loadEp: async () => {
      throw "51吃瓜当前页面未提供可用的视频地址";
    },
  };
}
