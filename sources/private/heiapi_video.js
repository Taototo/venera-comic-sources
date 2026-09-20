/** @type {import('../_venera_.js')} */
class PrivateHeiApiVideo extends ComicSource {
  type = "video";
  name = "黑 API资源（私人）";
  key = "private_heiapi_video";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url = "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/private/heiapi_video.js";

  settings = {
    api: {
      title: "JSON 接口",
      type: "input",
      default: "https://api.heiapi.cc/api.php/provide/vod/",
    },
  };

  get apiUrl() {
    let value = this.loadSetting("api") || this.settings.api.default;
    value = String(value).trim();
    if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
    return value.replace(/[?&]+$/, "");
  }

  get headers() {
    return {
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 12; K) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36",
      Accept: "application/json,text/plain,*/*",
      Referer: "https://api.heiapi.cc/",
    };
  }

  requestUrl(params) {
    let query = Object.keys(params)
      .map((key) => `${key}=${encodeURIComponent(params[key])}`)
      .join("&");
    return `${this.apiUrl}${this.apiUrl.indexOf("?") >= 0 ? "&" : "?"}${query}`;
  }

  async request(params) {
    let res = await Network.get(this.requestUrl(params), this.headers);
    if (res.status !== 200) throw `黑 API接口状态异常: ${res.status}`;
    let text = String(res.body || "").trim();
    if (!text || text[0] !== "{") throw "黑 API返回了无法解析的数据";
    text = text.replace(/("vod_id"\s*:\s*)(\d+)/g, '$1"$2"');
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw "黑 API返回了无效 JSON";
    }
    if (data.code !== undefined && Number(data.code) !== 1) {
      throw data.msg || "黑 API接口返回错误";
    }
    return data;
  }

  clean(value) {
    return String(value || "")
      .replace(/\\\//g, "/")
      .replace(/\\u0026/gi, "&")
      .replace(/\\u003d/gi, "=")
      .trim();
  }

  cover(value, id) {
    let text = this.clean(value);
    return text || `cover.${id}`;
  }

  toComic(item) {
    if (!item || item.vod_id === undefined || !item.vod_name) return null;
    let subtitle = [item.type_name, item.vod_year, item.vod_remarks]
      .filter((value) => value && String(value).trim())
      .join(" · ");
    let id = String(item.vod_id);
    return new Comic({
      id: id,
      title: String(item.vod_name),
      subTitle: subtitle,
      cover: this.cover(item.vod_pic || item.vod_pic_thumb, id),
      description: String(item.vod_blurb || item.vod_content || subtitle),
    });
  }

  parseList(data) {
    let comics = [];
    for (let item of Array.isArray(data.list) ? data.list : []) {
      let comic = this.toComic(item);
      if (comic) comics.push(comic);
    }
    return { comics: comics, maxPage: parseInt(data.pagecount, 10) || 1 };
  }

  async loadList(typeId, page, keyword) {
    let params = { ac: "list", pg: Number(page) || 1 };
    if (typeId) params.t = typeId;
    if (keyword) params.wd = keyword;
    return this.parseList(await this.request(params));
  }

  extractStream(value) {
    let text = this.clean(value);
    let match = text.match(
      /https?:\/\/[^"'<>\\\s]+?(?:\.m3u8|\.mp4)(?:\?[^"'<>\\\s]*)?/i
    );
    return match ? match[0].replace(/[),;]+$/, "") : "";
  }

  extractEntries(item) {
    let chapters = new Map();
    let groups = String(item && item.vod_play_url || "").split("$$$");
    for (let group of groups) {
      for (let entry of group.split("#")) {
        let value = this.clean(entry).trim();
        if (!value) continue;
        let separator = value.indexOf("$");
        let label = separator >= 0 ? value.substring(0, separator).trim() : "播放";
        let url = separator >= 0 ? value.substring(separator + 1).trim() : value;
        url = this.extractStream(url);
        if (!url) continue;
        chapters.set(url, label || "播放");
      }
    }
    return chapters;
  }

  categoryPart(name, entries) {
    return {
      name: name,
      type: "fixed",
      categories: entries.map((entry) => entry[0]),
      itemType: "category",
      categoryParams: entries.map((entry) => String(entry[1])),
    };
  }

  explore = [
    {
      title: "黑 API资源",
      type: "multiPartPage",
      load: async () => {
        let sections = [
          ["最新更新", ""],
          ["国产视频", "48"],
          ["传媒厂商", "55"],
          ["日本AV", "72"],
        ];
        let result = [];
        for (let section of sections) {
          try {
            let page = await this.loadList(section[1], 1);
            if (page.comics.length > 0) result.push({ title: section[0], comics: page.comics });
          } catch (_) {}
        }
        return result;
      },
    },
  ];

  category = {
    title: "黑 API资源",
    parts: [
      this.categoryPart("国产视频", [["全部", 48], ["国产自拍", 49], ["国产偷拍", 50], ["国产探花", 51], ["国产主播", 52], ["国产户外", 53], ["黑料吃瓜", 54], ["短视频", 112]]),
      this.categoryPart("传媒厂商", [["全部", 55], ["麻豆传媒", 56], ["精东影业", 57], ["蜜桃传媒", 58], ["果冻传媒", 59], ["天美传媒", 60], ["星空传媒", 61], ["皇家华人", 62], ["起点传媒", 63], ["渡边传媒", 64], ["葫芦影业", 65], ["红斯灯影像", 66], ["水果派解说", 67], ["SA传媒", 68], ["糖心Vlog", 69], ["性视界", 70], ["扣扣传媒", 104], ["爱豆传媒", 105], ["乌托邦传媒", 106], ["爱神传媒", 107], ["香蕉传媒", 108], ["大象传媒", 109], ["其他传媒", 110]]),
      this.categoryPart("日本AV", [["全部", 72], ["日本无码", 73], ["日本有码", 74], ["中字无码", 75], ["中字有码", 76]]),
      this.categoryPart("特殊嗜好", [["全部", 77], ["绿帽换妻", 78], ["SM调教", 79], ["男同系列", 80], ["女同系列", 81], ["乱伦系列", 82]]),
      this.categoryPart("网黄自制", [["全部", 83], ["台北娜娜", 84], ["玩偶姐姐", 85], ["饼干姐姐", 86], ["黑椒盖饭", 87], ["冉冉学姐", 88], ["小水水", 89], ["柚子猫", 90], ["捅主任", 91], ["鸡教练", 92], ["刘玥", 93], ["米菲兔", 111]]),
      this.categoryPart("三级伦理", [["全部", 94], ["国产伦理", 95], ["香港伦理", 96], ["台湾伦理", 97], ["韩国伦理", 98], ["日本伦理", 99], ["西方伦理", 100]]),
      this.categoryPart("其他", [["欧美AV", 101], ["美女写真", 102], ["成人动漫", 103]]),
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => this.loadList(String(param || ""), page || 1),
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => {
      let value = String(keyword || "").trim();
      if (!value) return { comics: [], maxPage: 1 };
      return this.loadList("", page || 1, value);
    },
    optionList: [],
  };

  comic = {
    onThumbnailLoad: (url) => ({ headers: this.headers }),

    loadInfo: async (id) => {
      let data = await this.request({ ac: "detail", ids: String(id) });
      let item = Array.isArray(data.list) ? data.list[0] : null;
      if (!item) throw "黑 API没有找到该视频";
      let chapters = this.extractEntries(item);
      let tags = [item.type_name, item.vod_area, item.vod_year]
        .filter((value) => value && String(value).trim());
      return new ComicDetails({
        title: String(item.vod_name || "黑 API资源"),
        subTitle: String(item.vod_remarks || ""),
        cover: this.cover(item.vod_pic || item.vod_pic_thumb, id),
        description: String(item.vod_content || item.vod_blurb || ""),
        tags: { 类型: tags },
        chapters: chapters,
        url: this.requestUrl({ ac: "detail", ids: String(id) }),
        maxPage: chapters.size,
      });
    },

    loadEp: async (comicId, epId) => {
      let videoUrl = this.extractStream(epId);
      if (!videoUrl) {
        let data = await this.request({ ac: "detail", ids: String(comicId) });
        let item = Array.isArray(data.list) ? data.list[0] : null;
        if (item) {
          let chapters = this.extractEntries(item);
          for (let url of chapters.keys()) {
            videoUrl = url;
            break;
          }
        }
      }
      if (!videoUrl) throw "黑 API当前集数没有可用的视频地址";
      return {
        images: [
          `venera-video:${JSON.stringify({ url: videoUrl, title: "黑 API资源", headers: this.headers })}`,
        ],
      };
    },
  };
}
