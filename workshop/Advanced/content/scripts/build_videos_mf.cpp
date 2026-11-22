// Windows SDK / Media Foundation: H.264 + AAC, and an independent decode pass.
// Input: storyboard beam paths, captioned NV12 plates and timed mono S16LE PCM.
#include <windows.h>
#include <mfapi.h>
#include <mfidl.h>
#include <mfreadwrite.h>
#include <wrl/client.h>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <sstream>
#include <vector>
#include <cmath>
#include <algorithm>
using Microsoft::WRL::ComPtr;
namespace fs=std::filesystem;
constexpr int W=1920,H=1080,F=24;
void ck(HRESULT h,int line){if(FAILED(h)){std::cerr<<"MF error "<<std::hex<<h<<" line "<<std::dec<<line<<"\n"; throw 1;}}
#define OK(x) ck((x),__LINE__)
using MT=ComPtr<IMFMediaType>;
MT type(GUID major,GUID sub){MT m;OK(MFCreateMediaType(&m));OK(m->SetGUID(MF_MT_MAJOR_TYPE,major));OK(m->SetGUID(MF_MT_SUBTYPE,sub));return m;}
MT video(GUID sub){auto m=type(MFMediaType_Video,sub);OK(MFSetAttributeSize(m.Get(),MF_MT_FRAME_SIZE,W,H));OK(MFSetAttributeRatio(m.Get(),MF_MT_FRAME_RATE,F,1));OK(MFSetAttributeRatio(m.Get(),MF_MT_PIXEL_ASPECT_RATIO,1,1));OK(m->SetUINT32(MF_MT_INTERLACE_MODE,MFVideoInterlace_Progressive));return m;}
MT audio(GUID sub,int sr){auto m=type(MFMediaType_Audio,sub);OK(m->SetUINT32(MF_MT_AUDIO_SAMPLES_PER_SECOND,sr));OK(m->SetUINT32(MF_MT_AUDIO_NUM_CHANNELS,1));OK(m->SetUINT32(MF_MT_AUDIO_BITS_PER_SAMPLE,16));OK(m->SetUINT32(MF_MT_AUDIO_AVG_BYTES_PER_SECOND,sub==MFAudioFormat_PCM?sr*2:12000));if(sub==MFAudioFormat_PCM)OK(m->SetUINT32(MF_MT_AUDIO_BLOCK_ALIGNMENT,2));return m;}
long long ts(long long frame){return frame*10000000/F;}
void sample(IMFSinkWriter* w,DWORD stream,const BYTE* data,int bytes,long long n){
 ComPtr<IMFMediaBuffer>b;ComPtr<IMFSample>s;OK(MFCreateMemoryBuffer(bytes,&b));BYTE*p;OK(b->Lock(&p,nullptr,nullptr));memcpy(p,data,bytes);OK(b->Unlock());OK(b->SetCurrentLength(bytes));OK(MFCreateSample(&s));OK(s->AddBuffer(b.Get()));OK(s->SetSampleTime(ts(n)));OK(s->SetSampleDuration(ts(n+1)-ts(n)));OK(w->WriteSample(stream,s.Get()));
}
void dot(std::vector<BYTE>&p,int x,int y,int r,BYTE lum,BYTE u,BYTE v){
 for(int j=std::max(0,y-r);j<std::min(H,y+r+1);j++)for(int i=std::max(0,x-r);i<std::min(W,x+r+1);i++){
 if((i-x)*(i-x)+(j-y)*(j-y)>r*r)continue;p[j*W+i]=lum;if(!((j|i)&1)){p[W*H+(j/2)*W+i]=u;p[W*H+(j/2)*W+i+1]=v;}}
}
// Camera pushes in on the UI detail without resampling surrounding labels.
void lens(const std::vector<BYTE>&src,std::vector<BYTE>&dst,double t){
 constexpr int x=80,y=262,w=1216,h=548;
 double inv=1./(1.+.075*(1.-cos(t*3.1415926535))*.5);
 int xx[w],uv[w]; for(int i=0;i<w;i++){xx[i]=int(w*.5+(i-w*.5)*inv);uv[i]=xx[i]&~1;}
 for(int j=0;j<h;j++){int sy=int(h*.5+(j-h*.5)*inv);
 const BYTE*row=src.data()+(y+sy)*W+x;BYTE*dest=dst.data()+(y+j)*W+x;
 for(int i=0;i<w;i++)dest[i]=row[xx[i]];
 if(j%2==0){row=src.data()+W*H+((y+sy)/2)*W+x;dest=dst.data()+W*H+((y+j)/2)*W+x;
 for(int i=0;i<w;i+=2){dest[i]=row[uv[i]];dest[i+1]=row[uv[i]+1];}}}
}
void encode(const fs::path&dir,const wchar_t*out){
 ComPtr<IMFAttributes>a;OK(MFCreateAttributes(&a,2));OK(a->SetUINT32(MF_SINK_WRITER_DISABLE_THROTTLING,TRUE));ComPtr<IMFSinkWriter>w;OK(MFCreateSinkWriterFromURL(out,nullptr,a.Get(),&w));DWORD vi,au;
 auto v=video(MFVideoFormat_H264);OK(v->SetUINT32(MF_MT_AVG_BITRATE,2200000));OK(w->AddStream(v.Get(),&vi));auto ac=audio(MFAudioFormat_AAC,48000);OK(w->AddStream(ac.Get(),&au));
 OK(w->SetInputMediaType(vi,video(MFVideoFormat_NV12).Get(),nullptr));OK(w->SetInputMediaType(au,audio(MFAudioFormat_PCM,48000).Get(),nullptr));OK(w->BeginWriting());
 std::ifstream plan(dir/"plan.txt"),pcm(dir/"audio.pcm",std::ios::binary);std::string line;std::vector<BYTE> base(W*H*3/2),p(base.size()),snd(48000/F*2);int n=0;
 while(std::getline(plan,line)){std::istringstream st(line);std::string name;int frames,x1,y1,x2,y2,start,total,zoom=0;st>>name>>frames>>x1>>y1>>x2>>y2>>start>>total;if(!st||frames<1)throw 2;st>>zoom;std::ifstream in(dir/name,std::ios::binary);if(!in.read((char*)base.data(),base.size()))throw 3;
 for(int i=0;i<frames;i++,n++){
 p=base;double t=(start+i+0.5)/total;double z=fmod((start+i)/72.,1.);z=z*z*(3-2*z);
 if(zoom)lens(base,p,t);
 for(int d=3;d>=1;--d){double q=std::max(0.,z-d*.025);dot(p,int(x1+(x2-x1)*q),int(y1+(y2-y1)*q),8-d,185,107,69);}
 dot(p,int(x1+(x2-x1)*z),int(y1+(y2-y1)*z),11,215,102,33);
 dot(p,int(x1+(x2-x1)*z),int(y1+(y2-y1)*z),4,240,128,128);
 for(int j=994;j<998;j++)memset(p.data()+W*j+64,200,int(1792*t));
 if(!pcm.read((char*)snd.data(),snd.size()))throw 4;
 sample(w.Get(),vi,p.data(),int(p.size()),n);sample(w.Get(),au,snd.data(),int(snd.size()),n);
 }}
 OK(w->Finalize());std::cout<<"Encoded "<<n<<" frames\n";
}
void verify(const wchar_t*file,const fs::path&dir){
 ComPtr<IMFSourceReader>r;OK(MFCreateSourceReaderFromURL(file,nullptr,&r));MT v,a;OK(r->GetNativeMediaType(MF_SOURCE_READER_FIRST_VIDEO_STREAM,0,&v));OK(r->GetNativeMediaType(MF_SOURCE_READER_FIRST_AUDIO_STREAM,0,&a));GUID vc,ac;UINT32 width,height;OK(v->GetGUID(MF_MT_SUBTYPE,&vc));OK(a->GetGUID(MF_MT_SUBTYPE,&ac));OK(MFGetAttributeSize(v.Get(),MF_MT_FRAME_SIZE,&width,&height));if(vc!=MFVideoFormat_H264||ac!=MFAudioFormat_AAC||width!=W||height!=H)throw 5;
 OK(r->SetCurrentMediaType(MF_SOURCE_READER_FIRST_VIDEO_STREAM,nullptr,type(MFMediaType_Video,MFVideoFormat_NV12).Get()));
 OK(r->SetCurrentMediaType(MF_SOURCE_READER_FIRST_AUDIO_STREAM,nullptr,type(MFMediaType_Audio,MFAudioFormat_PCM).Get()));
 std::ifstream times(dir/"samples.txt");int wanted=-1;times>>wanted;int count=0;double power=0;long long audioSamples=0;
 for(auto stream:{MF_SOURCE_READER_FIRST_VIDEO_STREAM,MF_SOURCE_READER_FIRST_AUDIO_STREAM}){
 while(true){DWORD flags;ComPtr<IMFSample>s;OK(r->ReadSample(stream,0,nullptr,&flags,nullptr,&s));if(flags&MF_SOURCE_READERF_ENDOFSTREAM)break;if(!s)continue;
 if(stream==MF_SOURCE_READER_FIRST_VIDEO_STREAM && count++!=wanted)continue;
 ComPtr<IMFMediaBuffer>b;OK(s->ConvertToContiguousBuffer(&b));BYTE*p;DWORD len;OK(b->Lock(&p,nullptr,&len));
 if(stream==MF_SOURCE_READER_FIRST_VIDEO_STREAM){std::ofstream f(dir/("decoded-"+std::to_string(wanted)+".nv12"),std::ios::binary);f.write((char*)p,len);if(!(times>>wanted))wanted=-1;}
 else{for(DWORD i=0;i+1<len;i+=2){double x=((short*)(p+i))[0]/32768.;power+=x*x;}audioSamples+=len/2;}
 OK(b->Unlock());}}
 if(wanted!=-1||count<1||!audioSamples||power/audioSamples<0.000001)throw 6;
 std::cout<<"Decoded H264 "<<width<<"x"<<height<<" frames="<<count<<" AAC samples="<<audioSamples<<" rmsDb="<<10*log10(power/audioSamples)<<"\n";
}
int wmain(int argc,wchar_t**argv){try{if(argc!=4)return 2;OK(CoInitializeEx(nullptr,COINIT_MULTITHREADED));OK(MFStartup(MF_VERSION));if(std::wstring(argv[1])==L"encode")encode(argv[2],argv[3]);else verify(argv[3],argv[2]);MFShutdown();CoUninitialize();return 0;}catch(...){return 1;}}
