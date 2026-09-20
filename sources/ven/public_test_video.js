/**
 * Public playback smoke-test source.
 *
 * The media is served by W3C/Mozilla public demo CDNs and is not tied to a
 * Chinese video site. It is intentionally small and deterministic so a user
 * can verify source import, poster loading, details, episode selection and
 * media_kit playback independently of a site's anti-bot or expiring links.
 * @type {import('../_venera_.js')}
 */
class PublicTestVideo extends ComicSource {
  type = "video";
  name = "公开测试视频（Ven）";
  key = "public_test_video";
  version = "1.0.0";
  minAppVersion = "1.0.0";
  url =
    "https://cdn.jsdelivr.net/gh/Taototo/venera-comic-sources@main/sources/ven/public_test_video.js";

  items = [
    {
      id: "sintel",
      title: "Sintel Trailer",
      subTitle: "W3C · MP4",
      cover: "https://media.w3.org/2010/05/sintel/poster.png",
      video: "https://media.w3.org/2010/05/sintel/trailer.mp4",
      category: "MP4 测试",
      description:
        "公开测试视频，用于验证 Venera 的视频源导入、详情页和播放器。",
    },
    {
      id: "bunny",
      title: "Big Buck Bunny Trailer",
      subTitle: "W3C · MP4",
      cover: "https://media.w3.org/2010/05/bunny/poster.png",
      video: "https://media.w3.org/2010/05/bunny/trailer.mp4",
      category: "MP4 测试",
      description:
        "公开测试视频，用于验证封面、详情和进度拖动。",
    },
    {
      id: "flower",
      title: "Flower",
      subTitle: "Mozilla · MP4",
      cover: "https://dummyimage.com/600x900/17324d/ffffff.png&text=Flower",
      video:
        "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      category: "MP4 测试",
      description:
        "Mozilla 提供的 CC0 示例视频，用于验证音量、倍速和全屏。",
    },
    {
      id: "mux_hls",
      title: "Mux HLS Test Stream",
      subTitle: "Mux · HLS",
      cover: "https://dummyimage.com/600x900/512b58/ffffff.png&text=HLS",
      video: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      category: "HLS 测试",
      description:
        "公开 HLS 测试流，用于确认 media_kit 的 HLS 播放链路。",
    },
  ];

  comicFor(item) {
    return new Comic({
      id: item.id,
      title: item.title,
      subTitle: item.subTitle,
      cover: item.cover,
      description: item.description,
      tags: [item.category],
    });
  }

  findItem(id) {
    return this.items.find((item) => item.id === String(id)) || this.items[0];
  }

  result(keyword, page) {
    let value = String(keyword || "").trim().toLowerCase();
    let list = this.items.filter((item) => {
      if (!value) return true;
      return `${item.title} ${item.subTitle} ${item.category}`
        .toLowerCase()
        .includes(value);
    });
    return {
      comics: list.map((item) => this.comicFor(item)),
      maxPage: 1,
    };
  }

  explore = [
    {
      title: "公开测试首页",
      type: "multiPartPage",
      load: async () => [
        {
          title: "可播放测试视频",
          comics: this.items.map((item) => this.comicFor(item)),
        },
      ],
    },
  ];

  category = {
    title: "公开测试视频",
    parts: [
      {
        name: "分类",
        type: "fixed",
        categories: ["MP4 测试", "HLS 测试"],
        itemType: "category",
        categoryParams: ["mp4", "hls"],
      },
    ],
    enableRankingPage: false,
  };

  categoryComics = {
    load: async (category, param, options, page) => {
      let wanted = param === "hls" ? "HLS 测试" : "MP4 测试";
      return {
        comics: this.items
          .filter((item) => item.category === wanted)
          .map((item) => this.comicFor(item)),
        maxPage: 1,
      };
    },
    optionList: [],
  };

  search = {
    load: async (keyword, options, page) => this.result(keyword, page),
    optionList: [],
  };

  comic = {
    loadInfo: async (id) => {
      let item = this.findItem(id);
      return new ComicDetails({
        title: item.title,
        subTitle: item.subTitle,
        cover: item.cover,
        description: item.description,
        tags: { 类型: [item.category], 授权: ["公开测试媒体"] },
        chapters: new Map([["play", "播放"]]),
        url: item.video,
        maxPage: 1,
      });
    },

    loadEp: async (id, ep) => {
      let item = this.findItem(id);
      return {
        images: [
          `venera-video:${JSON.stringify({
            url: item.video,
            title: item.title,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36",
              Referer: "https://media.w3.org/",
            },
          })}`,
        ],
      };
    },
  };
}
