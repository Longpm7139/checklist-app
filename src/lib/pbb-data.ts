export interface PbbTaskDef {
  no: string;
  name: string;
  reqs: [string, string, string, string]; // 1M, 3M, 6M, 12M respectively
  subTasks?: PbbTaskDef[];
}

export interface PbbSectionDef {
  no: string;
  name: string;
  tasks: PbbTaskDef[];
}

export const PBB_CHECKLIST_SECTIONS: PbbSectionDef[] = [
  {
    no: '1',
    name: 'Các công tắc hành trình / Limit switches',
    tasks: [
      {
        no: '1',
        name: 'Vận hành cầu để kiểm tra các giới hạn sau / Operate the bridge to inspect the following limit switches:',
        reqs: ['I', 'I', 'I', 'I'],
        subTasks: [
          { no: 'a', name: 'Chuyển động ngang / Horizontal travel', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'b', name: 'Chuyển động quay trục boogie / Max boogie steering', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'c', name: 'Chuyển động lên xuống canopy của Cabin / Canopy up & down', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'd', name: 'Các công tắc hành trình chuyển động lên xuống / Vertical limit switches', reqs: ['', '', 'I', 'I'] },
          { no: 'e', name: 'Độ dốc cho phép / Slope limit', reqs: ['I', '', 'I', 'I'] },
          { no: 'f', name: 'Góc quay lớn nhất của Cabin / Max cab Rotation', reqs: ['', '', 'I', 'I'] },
          { no: 'g', name: 'Góc quay lớn nhất của Rotunda / Max Rotunda swing', reqs: ['', '', 'I', 'I'] },
          { no: 'h', name: 'Chuyển động lên xuống của hệ thống tự động điều chỉnh độ cao sàn Cabin / Auto level up & down', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'i', name: 'Kiểm tra Safety shoe / Check safety shoe', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'j', name: 'Kiểm tra cảm biến hồng ngoại / Infra slow down sensor', reqs: ['', '', 'I', 'I'] }
        ]
      }
    ]
  },
  {
    no: '2',
    name: 'Cửa Cabin / Shutter door',
    tasks: [
      { no: '2.1', name: 'Kiểm tra xem có bị cong vênh / Check the alignment', reqs: ['I', 'I', 'I', 'I'] },
      { no: '2.2', name: 'Kiểm tra chốt, khóa / Check the key/ Locking mechanism', reqs: ['I', 'I', 'I', 'I'] }
    ]
  },
  {
    no: '3',
    name: 'Hệ thống tự động điều chỉnh cao độ sàn Cabin / Auto level',
    tasks: [
      { no: '3.1', name: 'Kiểm tra toàn bộ đai ốc kết nối bánh xe với công tắc hành trình / Check the set of screws which hold the wheel...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '3.2', name: 'Dùng tay quay bánh xe theo hai chiều để đảm bảo không bị kẹt bánh khi vận hành... / Turn the wheel by hand...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '3.3', name: 'Kiểm tra cần với / Check the arm', reqs: ['I', 'I', 'I', 'I'] },
      { no: '3.4', name: 'Bật chế độ AUTO LEVEL & kiểm tra hệ thống tự động điều chỉnh cao độ sàn Cabin... / Turn on AUTO LEVEL & check...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '3.5', name: 'Xoay và giữ bánh xe bằng tay để mô phỏng sự lên của sàn máy bay... / Turn & hold wheel by hand...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '3.6', name: 'Khởi động lại auto level và kiểm tra hành trình xuống bằng cách xoay và giữ bánh xe theo hướng ngược lại... / Reset the auto level...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '3.7', name: 'Bật trạng thái khẩn cấp bằng cách nhấn nút "EMERGENCY" khi cầu đang ở chế độ tự động... / Check the sound of the alarm horn', reqs: ['I', 'I', 'I', 'I'] },
      { no: '3.8', name: 'Tra mỡ xích dẫn động, bánh tỳ và rail chuyển động / Lubricate chain, guide rail', reqs: ['', 'L', 'L', 'L'] }
    ]
  },
  {
    no: '4',
    name: 'Xích truyền động / Motor drive chain',
    tasks: [
      { no: '4', name: 'Kiểm tra xích truyền động của động cơ chuyển động ngang, động cơ Cabin / Check drive chain of cabin motor & horizontal motor', reqs: ['I', 'I', 'I', 'I'] }
    ]
  },
  {
    no: '5',
    name: 'Cabin',
    tasks: [
      { no: '5.1', name: 'Kiểm tra chuyển động xoay của Cabin bằng cách quay Cabin sang trái và phải đến góc quay giới hạn / Check cabin rotation...', reqs: ['', '', 'I', 'I'] },
      { no: '5.2', name: 'Kiểm tra hoạt động của mái chụp vào máy bay / Check closure operation:', reqs: ['', '', '', ''], subTasks: [
          { no: 'a', name: 'Hạ thấp cả phía trái & phải của vòm mái che tại cùng thời điểm... / Lower both left & right canopies...', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'b', name: 'Nâng cả phía trái và phía phải của vòm mái che. Động cơ sẽ ngừng hoạt động khi mái che đi đến giới hạn / Raise both left & right canopies...', reqs: ['I', 'I', 'I', 'I'] }
      ]},
      { no: '5.3', name: 'Kiểm tra các tấm màn Cabin, điều chỉnh nếu cần thiết / Check the cabin side curtains for tightness', reqs: ['I', 'I', 'I', 'I'] },
      { no: '5.4', name: 'Kiểm tra con lăn tỳ mành cuốn cabin / Check the cabin roller blind', reqs: ['I', 'I', 'I', 'I'] },
      { no: '5.5', name: 'Kiểm tra cảm biến góc cabin / Check cabin angle sensor', reqs: ['I', 'I', 'I', 'I'] },
      { no: '5.6', name: 'Đưa cảm biến góc cabin về giá trị và tọa độ ban đầu / Return the cabin angle sensor to original position', reqs: ['', '', '', 'I'] },
      { no: '5.7', name: 'Kiểm tra các cáp điện / Check the following electrical cable:', reqs: ['', '', '', ''], subTasks: [
          { no: 'a', name: 'Các cáp điện bên dưới ống lồng / Exposed cables under tunnels', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'b', name: 'Các cáp điện bên dưới Cabin / Exposed cables under cabin', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'c', name: 'Các cáp điện từ cột Rotunda đến tunnel / Cable from rotunda to tunnel', reqs: ['I', 'I', 'I', 'I'] }
      ]},
      { no: '5.8', name: 'Kiểm tra giảm xóc & cảm biến giới hạn trái và phải của Cabin / Check the bumper condition & left/right limit sensor...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '5.9', name: 'Tra mỡ cho các thiết bị cơ khí của vòm mái che / Lubricate closure mechanical parts', reqs: ['L', 'L', 'L', 'L'] },
      { no: '5.10', name: 'Tra mỡ các thiết bị cơ khí của Cabin / Lubricate cabin mechanical parts', reqs: ['L', 'L', 'L', 'L'] },
      { no: '5.11', name: 'Tra mỡ các bộ phận của thiết bị tự động điều chỉnh cao độ sàn / Lubricate cabin levelling floor', reqs: ['L', 'L', 'L', 'L'] },
      { no: '5.12', name: 'Kiểm tra hệ thống lạnh / Check air conditioner system', reqs: ['C', 'C', 'C', 'C'] },
      { no: '5.13', name: 'Kiểm tra chức năng Cabfloor bằng cách nhấn chọn chức năng Cabfloor... / Check the cabfloor function...', reqs: ['I', 'I', 'I', 'I'] }
    ]
  },
  {
    no: '6',
    name: 'Hệ thống truyền động nâng hạ / Vertical drive',
    tasks: [
      { no: '6.1', name: 'Kiểm tra làm sạch công tắc hành trình chiều cao cột / Check column height limit switch cleanliness', reqs: ['C', 'C', 'C', 'C'] },
      { no: '6.2', name: 'Kiểm tra báo lỗi công tắc hành trình lệch cột / Check vertical lift column fault limit switch', reqs: ['', '', '', ''], subTasks: [
          { no: 'a', name: 'Dùng tay gạt công tắc hành trình, trong khi người khác cố gắng nâng hoặc hạ cầu... / Manually trip limit switch...', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'b', name: 'Lặp lại quy trình trên với các công tắc hành trình khác / Repeat this procedure on the other limit switch', reqs: ['I', 'I', 'I', 'I'] }
      ]},
      { no: '6.3', name: 'Tra mỡ các tấm định hướng của cột (4 phía mỗi cột) / Lubricate column stainless steel guide plate', reqs: ['L', 'L', 'L', 'L'] },
      { no: '6.4', name: 'Kiểm tra các tiếng ồn lạ từ cột nâng hạ trong quá trình chuyển động / Check for vertical lift column abnormal noise...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '6.5', name: 'Kiểm tra đo đạc độ nghiêng của 2 cột nâng hạ / Measure the tilt of two lifting columns', reqs: ['M', 'M', 'M', 'M'] },
      { no: '6.6', name: 'Kiểm tra các ống thuỷ lực / Check hydraulic hose', reqs: ['I', 'I', 'I', 'I'] },
      { no: '6.7', name: 'Kiểm tra các khối van thuỷ lực / Check valvets hydraulic', reqs: ['I', 'I', 'I', 'I'] },
      { no: '6.8', name: 'Kiểm tra bộ nguồn thuỷ lực / Check hydraulic power unit', reqs: ['I', 'I', 'I', 'I'] },
      { no: '6.9', name: 'Kiểm tra lọc thuỷ lực / Check hydraulic oil filter', reqs: ['I', 'I', 'I', 'R'] },
      { no: '6.10', name: 'Kiểm tra dầu thủy lực / Check hydraulic oil', reqs: ['I', 'I', 'I', 'R'] },
      { no: '6.11', name: 'Kiểm tra cảm biến chiều cao / Check height sensor', reqs: ['I', 'I', 'I', 'I'] },
      { no: '6.12', name: 'Đưa cảm biến chiều cao về giá trị và tọa độ ban đầu / Return the height sensor out of its original position', reqs: ['', '', '', 'I'] }
    ]
  },
  {
    no: '7',
    name: 'Hệ thống dẫn động ngang / Horizontal drive',
    tasks: [
      { no: '7.1', name: 'Kiểm tra xích động cơ dẫn động / Check drive chain of horizontal motor', reqs: ['I', 'I', 'I', 'I'] },
      { no: '7.2', name: 'Lái cầu tiến lên giới hạn phía trước và lùi lại / Drive the bridge fully forward & Reverse', reqs: ['I', 'I', 'I', 'I'] },
      { no: '7.3', name: 'Đảm bảo còi báo di chuyển hoạt động trong suốt quá trình cầu di chuyển / Ensure the travel warning horn is activated...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '7.4', name: 'Quay trục bánh xe sang trái và phải hết giới hạn / Steer the wheel boogie to the left & right extremely', reqs: ['I', 'I', 'I', 'I'] },
      { no: '7.5', name: 'Kiểm tra cảm biến góc bánh xe / Check wheel sensor', reqs: ['I', 'I', 'I', 'I'] },
      { no: '7.6', name: 'Đưa giá trị cảm biến góc bánh xe về giá trị ban đầu / Return the wheel sensor to its original position', reqs: ['', '', '', 'I'] },
      { no: '7.7', name: 'Tra mỡ ổ bi / Lubricate rooler bearing', reqs: ['', 'L', 'L', 'L'] },
      { no: '7.8', name: 'Tra mỡ khớp nối, ổ trục / Lubricate bushings & Trunion pin', reqs: ['', 'L', 'L', 'L'] },
      { no: '7.9', name: 'Tra mỡ các xích truyền động trên cụm bánh xe / Lubricate drive chains on the wheel assembly', reqs: ['L', 'L', 'L', 'L'] },
      { no: '7.10', name: 'Kiểm tra khe hở phanh của 02 động cơ bánh xe / Check the brake clearance of both wheel motors', reqs: ['I', 'I', 'I', 'I'] }
    ]
  },
  {
    no: '8',
    name: 'Bánh lốp (Lốp đặc) / Tires',
    tasks: [
      { no: '8.1', name: 'Kiểm tra độ mòn của lốp / Check surface wear of tires', reqs: ['', 'I', 'I', 'I'] },
      { no: '8.2', name: 'Kiểm tra lực xiết các bulông (Lực xiết ≥ 392 N.m) / Check tire mounting bolts and nuts', reqs: ['', 'I', 'I', 'I'] }
    ]
  },
  {
    no: '9',
    name: 'Rotunda',
    tasks: [
      { no: '9.1', name: 'Kiểm tra các công tắc hành trình để đảm bảo các công tắc này hoạt động an toàn / Check the limit switches...', reqs: ['', '', '', ''], subTasks: [
          { no: 'a', name: 'Công tắc hành trình quay Rotunda / Rotunda rotary limit switch', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'b', name: 'Công tắc giới hạn độ dốc / Slop limit switch', reqs: ['I', 'I', 'I', 'I'] }
      ]},
      { no: '9.2', name: 'Kiểm tra độ trùng mành cuốn / Check Rotunda curtain slat tension', reqs: ['I', 'I', 'I', 'I'] },
      { no: '9.3', name: 'Kiểm tra trần sàn, con lăn trần sàn, các bánh răng, xích / Check ceiling, roller and chain', reqs: ['I', 'I', 'I', 'I'] },
      { no: '9.4', name: 'Kiểm tra thảm sàn Rotunda để đảm bảo sàn không bị vênh, điều chỉnh nếu cần thiết / Check the Rotunda floor mat...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '9.5', name: 'Tra mỡ ổ bi và bạc lót / Lubricate rotunda column flange & sleeve bearings', reqs: ['', 'L', 'L', 'L'] },
      { no: '9.6', name: 'Kiểm tra cảm biến góc rotunda / Check rotunda angle sensor', reqs: ['I', 'I', 'I', 'I'] },
      { no: '9.7', name: 'Đưa cảm biến góc rotunda về vị trí ban đầu / Return the rotunda angle sensor to its original position', reqs: ['', '', '', 'I'] }
    ]
  },
  {
    no: '10',
    name: 'Ống lồng / Tunnel',
    tasks: [
      { no: '10.1', name: 'Tra mỡ các khung treo cáp / Lubricate cable tension device sheave mounts', reqs: ['L', 'L', 'L', 'L'] },
      { no: '10.2', name: 'Tra mỡ hệ thống cuộn cáp và điều chỉnh lại hệ thống / Lubricate tunnel cable take-up & Equalising system parts', reqs: ['', 'L', 'L', 'L'] },
      { no: '10.3', name: 'Kiểm tra và tra dầu mỡ chốt / Check & lubricate hinge pin', reqs: ['L', 'L', 'L', 'L'] },
      { no: '10.4', name: 'Kiểm tra và tra mỡ hệ thống con lăn / Inspection and lubricate roller units', reqs: ['', 'L', 'L', 'L'] },
      { no: '10.5', name: 'Tra mỡ các thanh rail con lăn bao gồm thanh rail bên trong và bên ngoài / Lubricate rail include inside and outside', reqs: ['', 'L', 'L', 'L'] }
    ]
  },
  {
    no: '11',
    name: 'Các bộ phận khác của PBB / Other structures of PBB',
    tasks: [
      { no: '11.1', name: 'Kiểm tra xem có vết nứt, gãy xuất hiện trên tường, trần và sàn / Visually check for any crecks or damage...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '11.2', name: 'Kiểm tra đèn chiếu sáng, thay thế nếu cần thiết / Check for any blown lighting, replace if necessary', reqs: ['I', 'I', 'I', 'I'] },
      { no: '11.3', name: 'Kiểm tra các miếng nẹp kín / Check for any damage to weather strip or seals', reqs: ['I', 'I', 'I', 'I'] },
      { no: '11.4', name: 'Kiểm tra hiện trạng cầu thang dịch vụ / Check the condition of the staircase', reqs: ['I', 'I', 'I', 'I'] },
      { no: '11.5', name: 'Tra mỡ các chốt, bản lề của thang dịch vụ / Lubricate hinge pin of the staircase', reqs: ['L', 'L', 'L', 'L'] },
      { no: '11.6', name: 'Kiểm tra hiện trạng bề mặt các lớp sơn / Check the paint surface condition', reqs: ['I', 'I', 'I', 'I'] },
      { no: '11.7', name: 'Kiểm tra tổng quát các mối hàn của cầu ống / Check the welds of the passenger boarding bridge...', reqs: ['I', 'I', 'I', 'I'] }
    ]
  },
  {
    no: '12',
    name: 'Kết nối điện / Electrical connection',
    tasks: [
      { no: '12.1', name: 'Kiểm tra bảng điều khiển, tủ điện và các mạch điện chính / Inspect the control console, power panel...', reqs: ['', '', '', ''], subTasks: [
          { no: 'a', name: 'Kiểm tra các đường dây kết nối & các điểm treo / Check all PCB wire connections & Electrical mounting...', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'b', name: 'Kiểm tra độ ẩm, rỉ sét và các mảnh vỡ / Check for moisture, rust & debris', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'c', name: 'Kiểm tra các công tắc điều khiển / Check all the control buttons', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'd', name: 'Kiểm tra các công tắc ngắt mạch khẩn cấp / Check all the control button', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'e', name: 'Kiểm tra các thiết bị đo điện / Check all electrical measuring devices', reqs: ['', 'I', 'I', 'I'] },
          { no: 'f', name: 'Kiểm tra độ sáng rõ của màn hình cảm ứng / Check cleanliness of touch screen & all indicators', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'g', name: 'Kiểm tra độ sáng rõ của camera, vệ sinh / Check monitor camera side glass cleanliness...', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'h', name: 'Kiểm tra điện áp 3 pha cấp vào tủ điện chính nằm trong ngưỡng 230/400 VAC ±10%', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'i', name: 'Kiểm tra bộ nguồn DC: đèn "DC OK" / Check the DC power supply...', reqs: ['', 'I', 'I', 'I'] },
          { no: 'j', name: 'Kiểm tra Acquy, bộ UPS DC / Check the battery, DC UPS unit...', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'k', name: 'Xiết chặt các tiếp điểm đấu nối động lực và điều khiển', reqs: ['', '', 'I', 'I'] },
          { no: 'l', name: 'Kiểm tra PLC: các đèn trạng thái bình thường / Check the PLC...', reqs: ['I', 'I', 'I', 'I'] }
      ]},
      { no: '12.2', name: 'Kiểm tra bộ chống sét lan truyền tủ điện / Check the surge protection device (SPD)...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '12.3', name: 'Kiểm tra điện trở cách điện các động cơ điện (> 1 MΩ) / Check the insulation resistance...', reqs: ['', '', 'I', 'I'] },
      { no: '12.4', name: 'Kiểm tra điện áp cuộn thắng của 02 động cơ bánh xe (100VDC ≤ U ≤ 110VDC) / Check the brake coil voltage...', reqs: ['', '', 'I', 'I'] },
      { no: '12.5', name: 'Đo và ghi giá trị dòng điện của động cơ canopy bên trái trong khi hoạt động / Measure and record...', reqs: ['', '', 'M', 'M'] },
      { no: '12.6', name: 'Đo và ghi giá trị dòng điện của động cơ canopy bên phải trong khi hoạt động / Measure and record...', reqs: ['', '', 'M', 'M'] },
      { no: '12.6*', name: 'Đo và ghi giá trị dòng điện của động cơ xoay cabin trong khi hoạt động / Measure and record...', reqs: ['', '', 'M', 'M'] }, // Numbered 12.6 again in image
      { no: '12.8', name: 'Đo và ghi giá trị dòng điện của động cơ bánh xe bên trái trong khi hoạt động / Measure and record...', reqs: ['', '', 'M', 'M'] },
      { no: '12.9', name: 'Đo và ghi giá trị dòng điện của động cơ bánh xe bên phải trong khi hoạt động / Measure and record...', reqs: ['', '', 'M', 'M'] },
      { no: '12.10', name: 'Đo và ghi giá trị dòng điện của động cơ bơm thủy lực trong khi hoạt động / Measure and record...', reqs: ['', '', 'M', 'M'] },
      { no: '12.11', name: 'Đo và ghi giá trị dòng điện của động cơ auto level trong khi hoạt động / Measure and record...', reqs: ['', '', 'M', 'M'] },
      { no: '12.12', name: 'Đo và ghi giá trị dòng điện của động cơ tự động điều chỉnh cân bằng sàn... / Measure and record...', reqs: ['', '', 'M', 'M'] }
    ]
  },
  {
    no: '13',
    name: 'Tình trạng chung của bên ngoài và lớp bảo vệ ngoài trời / General condition...',
    tasks: [
      { no: '13.1', name: 'Kiểm tra thiết bị căng cáp, điều chỉnh khi cần thiết / Check the cable tension device. Adjust if necessary', reqs: ['I', 'I', 'I', 'I'] },
      { no: '13.2', name: 'Kiểm tra lớp bảo vệ ngoài trời sau đây / Check the following weather seals', reqs: ['', '', '', ''], subTasks: [
          { no: 'a', name: 'Từ Rotunda đến Gangway / Rotunda to Gangway', reqs: ['I', 'I', 'I', 'I'] },
          { no: 'b', name: 'Lớp bảo vệ ngoài trời giữa các ống lồng / Weather seal between the tunnel', reqs: ['I', 'I', 'I', 'I'] }
      ]},
      { no: '13.3', name: 'Kiểm tra vết nứt và rỉ sét trên bề mặt sơn, sơn sửa nếu cần thiết / Inspect to paint...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '13.4', name: 'Kiểm tra độ chặt của các bulong gắn trên các động cơ bánh xe và động cơ nâng hạ / Check the mounting bolt...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '13.5', name: 'Kiểm tra bộ phận theo dõi con lăn (bánh đà) ống lồng. Điều chỉnh nếu cần thiết / Check tunnel roller tracking...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '13.6', name: 'Kiểm tra hoạt động bánh xe nhỏ của thang dịch vụ / Inspect service staircase castor wheel condition', reqs: ['I', 'I', 'I', 'I'] }
    ]
  },
  {
    no: '14',
    name: 'Safety Hoop',
    tasks: [
      { no: '14.1', name: 'Kiểm tra xem cầu có dừng hoạt động và cảnh báo khi tác động safetyhoop phía trước không... / Check if the bridge stops...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '14.2', name: 'Kiểm tra xem cầu có dừng hoạt động và cảnh báo khi tác động safetyhoop phía sau không... / Check if the bridge stops...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '14.3', name: 'Vào màn hình, chuyển sang chế độ bypass, kiểm tra xem có tin nhắn hiển thị không... / Access the screen...', reqs: ['I', 'I', 'I', 'I'] },
      { no: '14.4', name: 'Kiểm tra cầu có hoạt động ở chế độ bypass khi tác động safetyhoop phía trước và phía sau / Check if the bridge...', reqs: ['I', 'I', 'I', 'I'] }
    ]
  }
];
