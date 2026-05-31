export interface PbbTaskDef {
  no: string;
  name: string;
  reqs: [string, string, string]; // 1T, 6T, 12T
  subTasks?: PbbTaskDef[];
}

export interface PbbSectionDef {
  no: string;
  name: string;
  tasks: PbbTaskDef[];
}

// 1T items: reqs=['I','','']  |  6T+12T items: reqs=['','I','I']

export const PBB_CHECKLIST_SECTIONS: PbbSectionDef[] = [
  // ============ 1T: FILE 1 ============
  {
    no: 'A',
    name: 'A. Kiểm tra phần cơ khí / Mechanical Checks',
    tasks: [
      { no: '1', name: 'Nâng bằng cầu và kéo cầu tới giới hạn / Fully extend and level the bridge', reqs: ['I','',''] },
      { no: '2', name: 'Ngắt toàn bộ nguồn điện ra khỏi cầu / Remove all power from the bridge', reqs: ['I','',''] },
      { no: '3', name: 'Kiểm tra độ chính xác của sàn và trần Rotunda / Verify that both the rotunda floor and ceiling are properly aligned', reqs: ['I','',''] },
      { no: '4', name: 'Kiểm tra độ chính xác và độ căng của màn cuốn Rotunda / Verify that the rotunda curtain is properly aligned and tensioned', reqs: ['I','',''] },
      { no: '5', name: 'Kiểm tra thảm sàn và lót sàn Rotunda / Inspect the rotunda floors carpet, threshold plate and aluminum pound downs', reqs: ['I','',''] },
      { no: '6', name: 'Kiểm tra chốt kết nối vị trí đặt A tunnel và trụ Rotunda / Verify that tunnel A is properly positioned in the rotunda rigid frame', reqs: ['I','',''] },
      { no: '7', name: 'Kiểm tra kính tunnel, tấm dốc chuyển tiếp, tay vịn và thảm sàn tunnel / Inspect the tunnel walls, transition ramps, handrails, and carpet', reqs: ['I','',''] },
      { no: '8', name: 'Kiểm tra vị trí kết nối của các đốt cầu Tunnel và dẫn hướng phù hợp / Verify that the tunnels are properly positioned and are tracking properly', reqs: ['I','',''] },
      { no: '9', name: 'Kiểm tra khoảng cách trần và sàn trên của các đốt cầu được căn chỉnh chính xác / Verify that both the bubble floor and ceiling are properly aligned', reqs: ['I','',''] },
      { no: '10', name: 'Kiểm tra dải cao su chắn nước bên ngoài cầu và các nẹp nhôm cao su chắn nước / Inspect the bubble floors ribbed rubber and aluminum pound downs', reqs: ['I','',''] },
      { no: '11', name: 'Kiểm tra độ căng và chính xác của màn cuốn Cabin / Verify that the cab curtain is properly aligned and tensioned', reqs: ['I','',''] },
      { no: '12', name: 'Kiểm tra hoạt động và vệ sinh cửa Cabin ra máy bay / Inspect the cab doors for cleanliness and proper operation', reqs: ['I','',''] },
      { no: '13', name: 'Kiểm tra cửa Cabin và các cửa sổ / Inspect all cab and bubble windows', reqs: ['I','',''] },
      { no: '14', name: 'Kiểm tra và vệ sinh cửa dịch vụ / Inspect the service door for cleanliness and proper operation', reqs: ['I','',''] },
      { no: '15', name: 'Kiểm tra xích dẫn động Cabin / Inspect the cab drive chain', reqs: ['I','',''] },
      { no: '16', name: 'Kiểm tra giá đỡ trục Cabin và các kết nối thanh giằng (nằm trên nóc Cabin) / Inspect the cab pivot bracket and tie rod connections', reqs: ['I','',''] },
      { no: '17', name: 'Kiểm tra hư hỏng vật lý đối với các thiết bị phụ trợ cấp điện và cấp khí mát nếu có / Inspect for any physical damage to the JTP and PC air units if present', reqs: ['I','',''] },
      { no: '18', name: 'Kiểm tra hệ thống dẫn động bánh xe / Inspect the wheel bogie', reqs: ['I','',''] },
      { no: '19', name: 'Kiểm tra hệ thống treo cáp và cáp tunnel / Inspect the cable carrier system operation and make sure that the cables are not worn or binding', reqs: ['I','',''] },
      { no: '20', name: 'Kiểm tra cân bằng và độ trùng của cáp / Inspect the equalizing cable and clamping ring. Make sure that the cable is not sagging', reqs: ['I','',''] },
      { no: '21', name: 'Kiểm tra tủ điện và cáp điện không bị hư hỏng vật lý / Verify that the input power panel and input cables are not physically damaged', reqs: ['I','',''] },
      { no: '22', name: 'Kiểm tra tất cả dây cáp điện có hư hỏng vật lý không / Inspect all electrical cables for physical damage', reqs: ['I','',''] },
    ]
  },
  {
    no: 'B',
    name: 'B. Kiểm tra phần điện / Electrical Checks',
    tasks: [
      { no: '1', name: 'Kiểm tra tủ điện chính / Inspect the inside of the main bridge power panel. Verify that the proper voltages are present', reqs: ['I','',''] },
      { no: '2', name: 'Kiểm tra tủ điện của cầu (Cabin) - Tìm các dây lỏng và hư hỏng / Inspect the inside of the bridge control console. Look for loose wires and/or damaged components', reqs: ['I','',''] },
      { no: '3', name: 'Bật lại nguồn điện cho cầu / Turn power back on to the bridge', reqs: ['I','',''] },
      { no: '4', name: 'Kiểm tra đèn trong Rotunda, tunnel và Cabin hoạt động bình thường / Verify that the lights in the rotunda, tunnels, bubble, and cab work properly', reqs: ['I','',''] },
      { no: '5', name: 'Kiểm tra đèn cảnh báo hoạt động bình thường / Verify that the emergency lights work properly', reqs: ['I','',''] },
      { no: '6', name: 'Kiểm tra đèn cảnh báo bật sáng khi mất điện trên cầu / Verify that the emergency lights come on when power to the bridge is removed', reqs: ['I','',''] },
    ]
  },
  {
    no: 'C',
    name: 'C. Kiểm tra vận hành / Operational Checks',
    tasks: [
      { no: '1', name: 'Kích hoạt CON-1 bằng cách xoay công tắc phím sang vị trí vận hành hoặc nhập đúng mật khẩu / Energize CON-1 by turning the key switch to the operate position or entering the correct password', reqs: ['I','',''] },
      { no: '2', name: 'Thực hiện điều chỉnh con lăn đường hầm (tham khảo sổ tay vận hành và bảo trì cầu) / Perform tunnel roller adjustment (refer to bridge operation and maintenance manual)', reqs: ['I','',''] },
      {
        no: '3',
        name: 'Lái cầu theo chiều ngang tới tất cả các giới hạn điện để phát hiện mọi sự cố vận hành / Drive the bridge horizontally to all electrical limits to detect any operational problems',
        reqs: ['I','',''],
        subTasks: [
          { no: 'a', name: 'Kiểm tra chuông và đèn cảnh báo di chuyển / Verify that the travel warning bell operates properly', reqs: ['I','',''] },
          { no: 'b', name: 'Nghe độ ồn con lăn / Listen carefully for any roller banging or scrapping noises', reqs: ['I','',''] },
          { no: 'c', name: 'Kiểm tra tất cả các giới hạn điện được đặt đúng vị trí / Verify that all electrical limits are set to the desired position', reqs: ['I','',''] },
          { no: 'd', name: 'Kiểm tra các công tắc giới hạn tốc độ chậm và dừng theo chiều ngang / Verify that the horizontal slowdown and stop limit switches work properly', reqs: ['I','',''] },
        ]
      },
      { no: '4', name: 'Kiểm tra các công tắc giới hạn độ xoay và độ dốc Rotunda / Manually manipulate the rotunda swing and slope limit switches and verify their proper operation', reqs: ['I','',''] },
      { no: '5', name: 'Kiểm tra giới hạn điện độ cao tối đa của cầu / Drive the bridge vertically to the maximum electrical limits to detect any operational problems', reqs: ['I','',''] },
      { no: '6', name: 'Kiểm tra giới hạn chiều cao và các công tắc giới hạn cột thủy lực / Manually manipulate the vertical height and column rack limit switches and verify their proper operation', reqs: ['I','',''] },
      { no: '7', name: 'Kiểm tra Canopies / Operate the canopies and verify that both sides operate properly', reqs: ['I','',''] },
      { no: '8', name: 'Kiểm tra khóa liên động Canopies / Verify that the canopy interlock works according to the canopy option selected', reqs: ['I','',''] },
      { no: '9', name: 'Kiểm tra sàn Cabin hoạt động chính xác cả chế độ bằng tay và chế độ tự động / Verify that the articulating cab floor operates correctly in both the automatic and manual modes', reqs: ['I','',''] },
      {
        no: '10',
        name: 'Kiểm tra hoạt động Autoleveler / Make sure that the autoleveler works properly',
        reqs: ['I','',''],
        subTasks: [
          { no: 'a', name: 'Kiểm tra vít kết nối và bánh xe được siết chặt / Make sure that the set screws that hold the wheel to the limit switch are tight', reqs: ['I','',''] },
          { no: 'b', name: 'Kiểm tra bánh xe Autoleveler / Check the wheel for wear, flat spots, shiny spots, or deterioration, and replace it if necessary', reqs: ['I','',''] },
          { no: 'c', name: 'Xoay bánh xe bằng tay cả hai hướng để đảm bảo không bị kẹt / Turn the wheel by hand in both directions to make sure that it moves freely and positively returns to neutral', reqs: ['I','',''] },
          { no: 'd', name: 'Kiểm tra đai ốc khóa trên cần Autoleveler được xiết chặt / Make sure that the locknuts on the autolevel arm are tight', reqs: ['I','',''] },
          { no: 'e', name: 'Kiểm tra cần Autoleveler di chuyển tự do cả hai hướng / Make sure that the autolevel arm moves freely in both directions', reqs: ['I','',''] },
          { no: 'f', name: 'Kiểm tra giới hạn hành trình Autoleveler / Check the autolevel travel limits with the arm extended and the bridge in AUTOLEVEL mode', reqs: ['I','',''] },
          { no: 'g', name: 'Xoay bánh xe bằng tay và giữ để mô phỏng máy bay đang bay lên - sau ~4 giây đèn cảnh báo và chuông phải kêu / Turn the wheel by hand and hold it to simulate the aircraft rising. After about 4 seconds the autolevel warning light turns on and the warning bell sounds', reqs: ['I','',''] },
          { no: 'h', name: 'Đặt lại Autoleveler rồi xoay bánh xe theo hướng ngược lại để mô phỏng hạ thấp máy bay - sau ~4 giây đèn cảnh báo và chuông phải kêu / Reset the autoleveler, turn wheel in opposite direction to simulate aircraft lowering. After about 4 seconds the autolevel warning light turns on and the warning bell sounds', reqs: ['I','',''] },
          { no: 'i', name: 'Đặt lại Autoleveler / Reset the autoleveler', reqs: ['I','',''] },
        ]
      },
    ]
  },
  {
    no: 'D',
    name: 'D. Bôi trơn / Lubrication',
    tasks: [
      { no: '1', name: 'Tiêu chuẩn chất bôi trơn: Multipurpose EP2 grease, SAE 30W-50 motor oil, SAE 30W-30 motor oil, Dry film lubricant containing Teflon, molybdenum disulfide, or graphite hoặc các loại tương đương / Lubrication standard: Multipurpose EP2 grease, SAE 30W-50 motor oil, SAE 30W-30 motor oil, Dry film lubricant', reqs: ['I','',''] },
      { no: '2', name: 'Bơm mỡ vào các vị trí có vú bơm: trụ xoay Rotunda, ổ bi mâm xoay bánh xe, hệ thống trụ nâng hạ và tra dầu mỡ nhớt vào cột thủy lực, bi lăn, dẫn hướng và ray / Grease all grease fittings: Rotunda pivot, wheel turntable bearings, lifting column system, and lubricate hydraulic column, rollers, guides and rails', reqs: ['L','',''] },
    ]
  },

  // ============ BỔ SUNG 6T ============
  {
    no: 'E6',
    name: 'Bổ sung công việc bảo dưỡng 6 tháng',
    tasks: [
      { no: '1', name: 'Kiểm tra, bảo dưỡng cột Rotunda và Rotunda', reqs: ['', 'I', ''] },
      { no: '2', name: 'Kiểm tra, bảo dưỡng hệ thống ống lồng (Tunnel)', reqs: ['', 'I', ''] },
      { no: '3', name: 'Kiểm tra, bảo dưỡng hệ thống Cabin và Canopy (Mái chụp)', reqs: ['', 'I', ''] },
      { no: '4', name: 'Kiểm tra, bảo dưỡng hệ thống nâng hạ', reqs: ['', 'I', ''] },
      { no: '5', name: 'Kiểm tra, bảo dưỡng hệ thống lái', reqs: ['', 'I', ''] },
      { no: '6', name: 'Kiểm tra vận hành toàn bộ thiết bị', reqs: ['', 'I', ''] },
    ]
  },

  // ============ BỔ SUNG 12T ============
  {
    no: 'E12',
    name: 'Bổ sung công việc bảo dưỡng 12 tháng',
    tasks: [
      { no: '1', name: 'Kiểm tra, bảo dưỡng cột Rotunda và Rotunda', reqs: ['', '', 'I'] },
      { no: '2', name: 'Kiểm tra, bảo dưỡng hệ thống ống lồng (Tunnel)', reqs: ['', '', 'I'] },
      { no: '3', name: 'Kiểm tra, bảo dưỡng hệ thống Cabin và Canopy (Mái chụp)', reqs: ['', '', 'I'] },
      { no: '4', name: 'Kiểm tra, bảo dưỡng hệ thống nâng hạ', reqs: ['', '', 'I'] },
      { no: '5', name: 'Kiểm tra, bảo dưỡng hệ thống lái', reqs: ['', '', 'I'] },
      { no: '6', name: 'Kiểm tra vận hành toàn bộ thiết bị', reqs: ['', '', 'I'] },
    ]
  },

  // ============ 6T / 12T: FILE 2 ============
  {
    no: 'A2',
    name: 'A. Kiểm tra phần cơ khí / Mechanical Checks',
    tasks: [
      { no: '1', name: 'Nâng bằng cầu và kéo cầu tới giới hạn / Fully extend and level the bridge', reqs: ['','I','I'] },
      { no: '2', name: 'Ngắt toàn bộ nguồn điện ra khỏi cầu / Remove all power from the bridge', reqs: ['','I','I'] },
      { no: '3', name: 'Kiểm tra độ chính xác của sàn và trần Rotunda / Verify that both the rotunda floor and ceiling are properly aligned', reqs: ['','I','I'] },
      { no: '4', name: 'Kiểm tra độ chính xác và độ căng của màn cuốn Rotunda / Verify that the rotunda curtain is properly aligned and tensioned', reqs: ['','I','I'] },
      { no: '5', name: 'Kiểm tra thảm sàn và lót sàn Rotunda / Inspect the rotunda floors carpet, threshold plate and aluminum pound downs', reqs: ['','I','I'] },
      { no: '6', name: 'Kiểm tra chốt kết nối vị trí đặt A tunnel và trụ Rotunda / Verify that tunnel A is properly positioned in the rotunda rigid frame', reqs: ['','I','I'] },
      { no: '7', name: 'Kiểm tra kính tunnel, tấm dốc chuyển tiếp, tay vịn và thảm sàn tunnel / Inspect the tunnel walls, transition ramps, handrails, and carpet', reqs: ['','I','I'] },
      { no: '8', name: 'Kiểm tra vị trí kết nối của các đốt cầu Tunnel và dẫn hướng phù hợp / Verify that the tunnels are properly positioned and are tracking properly', reqs: ['','I','I'] },
      { no: '9', name: 'Kiểm tra khoảng cách trần và sàn trên của các đốt cầu được căn chỉnh chính xác / Verify that both the bubble floor and ceiling are properly aligned', reqs: ['','I','I'] },
      { no: '10', name: 'Kiểm tra dải cao su chắn nước bên ngoài cầu và các nẹp nhôm cao su chắn nước / Inspect the bubble floors ribbed rubber and aluminum pound downs', reqs: ['','I','I'] },
      { no: '11', name: 'Kiểm tra độ căng và chính xác của màn cuốn Cabin / Verify that the cab curtain is properly aligned and tensioned', reqs: ['','I','I'] },
      { no: '12', name: 'Kiểm tra hoạt động và vệ sinh cửa Cabin ra máy bay / Inspect the cab doors for cleanliness and proper operation', reqs: ['','I','I'] },
      { no: '13', name: 'Kiểm tra cửa Cabin và các cửa sổ / Inspect all cab and bubble windows', reqs: ['','I','I'] },
      { no: '14', name: 'Kiểm tra và vệ sinh cửa dịch vụ / Inspect the service door for cleanliness and proper operation', reqs: ['','I','I'] },
      { no: '15', name: 'Kiểm tra xích dẫn động Cabin / Inspect the cab drive chain', reqs: ['','I','I'] },
      { no: '16', name: 'Kiểm tra giá đỡ trục Cabin và các kết nối thanh giằng (nằm trên nóc Cabin) / Inspect the cab pivot bracket and tie rod connections', reqs: ['','I','I'] },
      { no: '17', name: 'Kiểm tra hư hỏng vật lý đối với các thiết bị phụ trợ cấp điện và cấp khí mát nếu có / Inspect for any physical damage to the JTP and PC air units if present', reqs: ['','I','I'] },
      { no: '18', name: 'Kiểm tra hệ thống dẫn động bánh xe / Inspect the wheel bogie', reqs: ['','I','I'] },
      { no: '19', name: 'Kiểm tra hệ thống treo cáp và cáp tunnel / Inspect the cable carrier system operation and make sure that the cables are not worn or binding', reqs: ['','I','I'] },
      { no: '20', name: 'Kiểm tra cân bằng và độ trùng của cáp / Inspect the equalizing cable and clamping ring. Make sure that the cable is not sagging', reqs: ['','I','I'] },
      { no: '21', name: 'Kiểm tra tủ điện và cáp điện không bị hư hỏng vật lý / Verify that the input power panel and input cables are not physically damaged', reqs: ['','I','I'] },
      { no: '22', name: 'Kiểm tra tất cả dây cáp điện có hư hỏng vật lý không / Inspect all electrical cables for physical damage', reqs: ['','I','I'] },
    ]
  },
  {
    no: 'B2',
    name: 'B. Kiểm tra phần điện / Electrical Checks',
    tasks: [
      { no: '1', name: 'Kiểm tra tủ điện chính / Inspect the inside of the main bridge power panel. Verify that the proper voltages are present', reqs: ['','I','I'] },
      { no: '2', name: 'Kiểm tra tủ điện của cầu (Cabin) - Tìm các dây lỏng và hư hỏng / Inspect the inside of the bridge control console. Look for loose wires and/or damaged components', reqs: ['','I','I'] },
      { no: '3', name: 'Bật lại nguồn điện cho cầu / Turn power back on to the bridge', reqs: ['','I','I'] },
      { no: '4', name: 'Kiểm tra đèn trong Rotunda, tunnel và Cabin hoạt động bình thường / Verify that the lights in the rotunda, tunnels, bubble, and cab work properly', reqs: ['','I','I'] },
      { no: '5', name: 'Kiểm tra đèn cảnh báo hoạt động bình thường / Verify that the emergency lights work properly', reqs: ['','I','I'] },
      { no: '6', name: 'Kiểm tra đèn cảnh báo bật sáng khi mất điện trên cầu / Verify that the emergency lights come on when power to the bridge is removed', reqs: ['','I','I'] },
    ]
  },
  {
    no: 'C2',
    name: 'C. Kiểm tra vận hành / Operational Checks',
    tasks: [
      { no: '1', name: 'Kích hoạt CON-1 bằng cách xoay công tắc phím sang vị trí vận hành hoặc nhập đúng mật khẩu / Energize CON-1 by turning the key switch to the operate position or entering the correct password', reqs: ['','I','I'] },
      { no: '2', name: 'Thực hiện điều chỉnh con lăn đường hầm (tham khảo sổ tay vận hành và bảo trì cầu) / Perform tunnel roller adjustment (refer to bridge operation and maintenance manual)', reqs: ['','I','I'] },
      {
        no: '3',
        name: 'Lái cầu theo chiều ngang tới tất cả các giới hạn điện để phát hiện mọi sự cố vận hành / Drive the bridge horizontally to all electrical limits to detect any operational problems',
        reqs: ['','I','I'],
        subTasks: [
          { no: 'a', name: 'Kiểm tra chuông và đèn cảnh báo di chuyển / Verify that the travel warning bell operates properly', reqs: ['','I','I'] },
          { no: 'b', name: 'Nghe độ ồn con lăn / Listen carefully for any roller banging or scrapping noises', reqs: ['','I','I'] },
          { no: 'c', name: 'Kiểm tra tất cả các giới hạn điện được đặt đúng vị trí / Verify that all electrical limits are set to the desired position', reqs: ['','I','I'] },
          { no: 'd', name: 'Kiểm tra các công tắc giới hạn tốc độ chậm và dừng theo chiều ngang / Verify that the horizontal slowdown and stop limit switches work properly', reqs: ['','I','I'] },
        ]
      },
      { no: '4', name: 'Kiểm tra các công tắc giới hạn độ xoay và độ dốc Rotunda / Manually manipulate the rotunda swing and slope limit switches and verify their proper operation', reqs: ['','I','I'] },
      { no: '5', name: 'Kiểm tra giới hạn điện độ cao tối đa của cầu / Drive the bridge vertically to the maximum electrical limits to detect any operational problems', reqs: ['','I','I'] },
      { no: '6', name: 'Kiểm tra giới hạn chiều cao và các công tắc giới hạn cột thủy lực / Manually manipulate the vertical height and column rack limit switches and verify their proper operation', reqs: ['','I','I'] },
      { no: '7', name: 'Kiểm tra Canopies / Operate the canopies and verify that both sides operate properly', reqs: ['','I','I'] },
      { no: '8', name: 'Kiểm tra khóa liên động Canopies / Verify that the canopy interlock works according to the canopy option selected', reqs: ['','I','I'] },
      { no: '9', name: 'Kiểm tra sàn Cabin hoạt động chính xác cả chế độ bằng tay và chế độ tự động / Verify that the articulating cab floor operates correctly in both the automatic and manual modes', reqs: ['','I','I'] },
      {
        no: '10',
        name: 'Kiểm tra hoạt động Autoleveler / Make sure that the autoleveler works properly',
        reqs: ['','I','I'],
        subTasks: [
          { no: 'a', name: 'Kiểm tra vít kết nối và bánh xe được siết chặt / Make sure that the set screws that hold the wheel to the limit switch are tight', reqs: ['','I','I'] },
          { no: 'b', name: 'Kiểm tra bánh xe Autoleveler / Check the wheel for wear, flat spots, shiny spots, or deterioration, and replace it if necessary', reqs: ['','I','I'] },
          { no: 'c', name: 'Xoay bánh xe bằng tay cả hai hướng để đảm bảo không bị kẹt / Turn the wheel by hand in both directions to make sure that it moves freely and positively returns to neutral', reqs: ['','I','I'] },
          { no: 'd', name: 'Kiểm tra đai ốc khóa trên cần Autoleveler được xiết chặt / Make sure that the locknuts on the autolevel arm are tight', reqs: ['','I','I'] },
          { no: 'e', name: 'Kiểm tra cần Autoleveler di chuyển tự do cả hai hướng / Make sure that the autolevel arm moves freely in both directions', reqs: ['','I','I'] },
          { no: 'f', name: 'Kiểm tra giới hạn hành trình Autoleveler / Check the autolevel travel limits with the arm extended and the bridge in AUTOLEVEL mode', reqs: ['','I','I'] },
          { no: 'g', name: 'Xoay bánh xe bằng tay và giữ để mô phỏng máy bay đang bay lên - sau ~4 giây đèn cảnh báo và chuông phải kêu / Turn the wheel by hand and hold it to simulate the aircraft rising. After about 4 seconds the autolevel warning light turns on and the warning bell sounds', reqs: ['','I','I'] },
          { no: 'h', name: 'Đặt lại Autoleveler rồi xoay bánh xe theo hướng ngược lại để mô phỏng hạ thấp máy bay - sau ~4 giây đèn cảnh báo và chuông phải kêu / Reset the autoleveler, turn wheel in opposite direction to simulate aircraft lowering. After about 4 seconds warning light and bell activate', reqs: ['','I','I'] },
          { no: 'i', name: 'Đặt lại Autoleveler / Reset the autoleveler', reqs: ['','I','I'] },
        ]
      },
    ]
  },
  {
    no: 'D2',
    name: 'D. Bôi trơn / Lubrication',
    tasks: [
      { no: '1', name: 'Tiêu chuẩn chất bôi trơn: Multipurpose EP2 grease, SAE 30W-50 motor oil, SAE 30W-30 motor oil, Dry film lubricant containing Teflon, molybdenum disulfide, or graphite hoặc các loại tương đương / Lubrication standard: Multipurpose EP2 grease, SAE 30W-50 motor oil, SAE 30W-30 motor oil, Dry film lubricant', reqs: ['','I','I'] },
      { no: '2', name: 'Bơm mỡ vào các vị trí có vú bơm: trụ xoay Rotunda, ổ bi mâm xoay bánh xe, hệ thống trụ nâng hạ và tra dầu mỡ nhớt vào cột thủy lực, bi lăn, dẫn hướng và ray / Grease all grease fittings: Rotunda pivot, wheel turntable bearings, lifting column system, and lubricate hydraulic column, rollers, guides and rails', reqs: ['','L','L'] },
    ]
  },
];
